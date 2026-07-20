use std::path::Path;

use image::{DynamicImage, GenericImageView};
use paddleocr_rs_onnx::{OcrEngine, OrderBy};

use crate::tiangong_capture::CapturedGameFrame;
use crate::tiangong_inventory::{
  locate_inventory_layout,
  InventoryPage,
  InventoryLayout,
  InventoryTabKind,
  OcrTextBlock,
  ScannedStone,
  ScannedTextField,
  ShapeMask,
  StoneShape,
};

const MODEL_DET: &str = "pp-ocrv5-mobile-det.onnx";
const MODEL_REC: &str = "pp-ocrv5-mobile-rec.onnx";
const MODEL_KEYS: &str = "pp-ocrv5-keys.txt";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct InventoryHeader {
  pub tab: InventoryTabKind,
  pub reported_count: Option<usize>,
}

pub struct InventoryOcrEngine {
  engine: OcrEngine,
}

#[derive(Clone, Debug)]
pub struct RecognizedInventoryPage {
  pub page: InventoryPage,
  pub list_gray: Vec<u8>,
  pub list_width: usize,
  pub row_pitch_gray: usize,
}

impl InventoryOcrEngine {
  pub fn load(resource_dir: &Path) -> Result<Self, String> {
    let read = |name: &str| {
      std::fs::read(resource_dir.join(name))
        .map_err(|error| format!("OCR 模型缺失（{name}）：{error}"))
    };
    let det = read(MODEL_DET)?;
    let rec = read(MODEL_REC)?;
    let keys = read(MODEL_KEYS)?;
    let engine = OcrEngine::new(&det, &rec, &keys)
      .map_err(|error| format!("初始化本地 OCR 失败：{error}"))?;
    Ok(Self { engine })
  }

  pub fn recognize_blocks(
    &self,
    image: &DynamicImage,
  ) -> Result<Vec<OcrTextBlock>, String> {
    self
      .engine
      .recognize_all(image, OrderBy::Horizontal)
      .map(|blocks| {
        blocks
          .into_iter()
          .map(|block| {
            OcrTextBlock::new(
              block.text,
              block.x,
              block.y,
              block.width,
              block.height,
              block.confidence,
            )
          })
          .collect()
      })
      .map_err(|error| format!("本地 OCR 识别失败：{error}"))
  }

  pub fn inspect_frame(
    &self,
    frame: &CapturedGameFrame,
  ) -> Result<(DynamicImage, InventoryLayout, InventoryHeader), String> {
    let image = frame_to_image(frame)?;
    let right = image.crop_imm(
      image.width() * 55 / 100,
      0,
      image.width() * 45 / 100,
      image.height() * 34 / 100,
    );
    let offset_x = image.width() * 55 / 100;
    let mut blocks = self.recognize_blocks(&right)?;
    for block in &mut blocks {
      block.x += offset_x as f32;
    }
    let layout = locate_inventory_layout(image.width(), image.height(), &blocks)?;
    let active_tab = detect_active_tab(&image, &layout);
    let header = parse_inventory_header(&blocks, active_tab)?;
    Ok((image, layout, header))
  }

  pub fn recognize_page(
    &self,
    frame: &CapturedGameFrame,
  ) -> Result<RecognizedInventoryPage, String> {
    let (image, layout, header) = self.inspect_frame(frame)?;
    let list = image.crop_imm(
      layout.list.x,
      layout.list.y,
      layout.list.width,
      layout.list.height,
    );
    let gray_width = 96_u32;
    let gray_height = ((layout.list.height as f32
      * gray_width as f32
      / layout.list.width.max(1) as f32)
      .round() as u32)
      .max(1);
    let list_gray_image = list
      .resize_exact(
        gray_width,
        gray_height,
        image::imageops::FilterType::Triangle,
      )
      .to_luma8();
    let row_pitch_gray = (((layout.card_height + layout.row_gap) as f32
      * gray_height as f32
      / layout.list.height.max(1) as f32)
      .round() as usize)
      .max(1);

    let row_pitch = layout.card_height + layout.row_gap;
    let complete_rows = (layout.list.height + layout.row_gap) / row_pitch;
    let mut items = Vec::new();
    for row in 0..complete_rows {
      for column in 0..layout.columns as u32 {
        let x = layout.list.x
          + column * (layout.card_width + layout.column_gap);
        let y = layout.list.y + row * row_pitch;
        if x + layout.card_width > image.width()
          || y + layout.card_height > image.height()
        {
          continue;
        }
        let card = image.crop_imm(x, y, layout.card_width, layout.card_height);
        let raw_blocks = self.recognize_blocks(&card)?;
        let blocks = join_line_blocks(&raw_blocks);
        if !blocks
          .iter()
          .any(|block| block.text.replace(' ', "").contains("机巧石"))
        {
          continue;
        }
        let shape = match header.tab {
          InventoryTabKind::Craft => StoneShape::Craft,
          InventoryTabKind::Normal => {
            let shape_crop = card.crop_imm(
              layout.card_width * 18 / 100,
              layout.card_height * 18 / 100,
              layout.card_width * 64 / 100,
              layout.card_height * 38 / 100,
            );
            classify_shape_image(&shape_crop)
          }
        };
        items.push(parse_stone_text(
          format!("capture-{row}-{column}"),
          header.tab,
          shape,
          &blocks,
        ));
      }
    }
    if items.is_empty() && header.reported_count != Some(0) {
      return Err("未识别到库存卡片，请确认列表未被其他界面遮挡".to_string());
    }

    Ok(RecognizedInventoryPage {
      page: InventoryPage {
        tab: header.tab,
        reported_count: header.reported_count,
        first_index: 0,
        items,
      },
      list_gray: list_gray_image.into_raw(),
      list_width: gray_width as usize,
      row_pitch_gray,
    })
  }
}

pub fn frame_to_image(frame: &CapturedGameFrame) -> Result<DynamicImage, String> {
  image::RgbaImage::from_raw(frame.width, frame.height, frame.rgba.clone())
    .map(DynamicImage::ImageRgba8)
    .ok_or_else(|| "游戏截图像素尺寸无效".to_string())
}

pub fn parse_inventory_header(
  blocks: &[OcrTextBlock],
  active_tab: Option<InventoryTabKind>,
) -> Result<InventoryHeader, String> {
  let has_normal = blocks
    .iter()
    .any(|block| block.text.replace(' ', "").contains("机巧石"));
  let has_craft = blocks
    .iter()
    .any(|block| block.text.replace(' ', "").contains("匠心石"));
  if !has_normal || !has_craft {
    return Err("未识别到机巧石与匠心石页签".to_string());
  }
  let reported_count = blocks.iter().find_map(|block| {
    let compact = block.text.replace(' ', "");
    compact
      .split_once('/')
      .and_then(|(count, _)| count.parse::<usize>().ok())
  });
  if reported_count.is_none() {
    return Err("未识别到库存总数".to_string());
  }
  let tab = active_tab
    .ok_or_else(|| "无法判断当前库存页签，请重新打开机巧石或匠心石页签".to_string())?;
  Ok(InventoryHeader {
    tab,
    reported_count,
  })
}

fn detect_active_tab(
  image: &DynamicImage,
  layout: &InventoryLayout,
) -> Option<InventoryTabKind> {
  let tab_y = layout.panel.y + layout.panel.height * 4 / 100;
  let tab_height = layout.panel.height * 5 / 100;
  let first_x = layout.panel.x + layout.panel.width * 25 / 100;
  let tab_width = layout.panel.width * 18 / 100;
  let second_x = first_x + tab_width;
  let normal = gold_score(image, first_x, tab_y, tab_width, tab_height);
  let craft = gold_score(image, second_x, tab_y, tab_width, tab_height);
  let difference = normal.abs_diff(craft);
  if difference < 8 {
    None
  } else if normal > craft {
    Some(InventoryTabKind::Normal)
  } else {
    Some(InventoryTabKind::Craft)
  }
}

fn gold_score(
  image: &DynamicImage,
  x: u32,
  y: u32,
  width: u32,
  height: u32,
) -> usize {
  image
    .view(
      x.min(image.width()),
      y.min(image.height()),
      width.min(image.width().saturating_sub(x)),
      height.min(image.height().saturating_sub(y)),
    )
    .pixels()
    .step_by(4)
    .filter(|(_, _, pixel)| {
      let [red, green, blue, _] = pixel.0;
      red > 115 && green > 95 && red > blue.saturating_add(25)
    })
    .count()
}

pub fn extract_shape_mask(image: &DynamicImage) -> Result<ShapeMask, String> {
  let rgba = image.to_rgba8();
  let mut points = Vec::new();
  for (x, y, pixel) in rgba.enumerate_pixels() {
    let [red, green, blue, alpha] = pixel.0;
    let maximum = red.max(green).max(blue);
    let minimum = red.min(green).min(blue);
    let chroma = maximum.saturating_sub(minimum);
    if alpha > 0
      && maximum > 95
      && (chroma > 24 || minimum > 82)
    {
      points.push((x, y));
    }
  }
  if points.len() < 24 {
    return Err("未识别到机巧石形状".to_string());
  }

  let minimum_x = points.iter().map(|(x, _)| *x).min().unwrap_or(0);
  let maximum_x = points.iter().map(|(x, _)| *x).max().unwrap_or(0);
  let minimum_y = points.iter().map(|(_, y)| *y).min().unwrap_or(0);
  let maximum_y = points.iter().map(|(_, y)| *y).max().unwrap_or(0);
  let x_runs = projection_runs(
    minimum_x,
    maximum_x,
    |coordinate| {
      points
        .iter()
        .filter(|(x, _)| *x == coordinate)
        .count()
    },
  );
  let y_runs = projection_runs(
    minimum_y,
    maximum_y,
    |coordinate| {
      points
        .iter()
        .filter(|(_, y)| *y == coordinate)
        .count()
    },
  );
  if x_runs.is_empty() || y_runs.is_empty() || x_runs.len() > 4 || y_runs.len() > 4 {
    return Err("机巧石轮廓无法归一化为四格形状".to_string());
  }

  let point_set = points.into_iter().collect::<std::collections::HashSet<_>>();
  let mut cells = Vec::new();
  for (row, &(start_y, end_y)) in y_runs.iter().enumerate() {
    for (column, &(start_x, end_x)) in x_runs.iter().enumerate() {
      let area = (end_x - start_x + 1) as usize * (end_y - start_y + 1) as usize;
      let filled = (start_y..=end_y)
        .flat_map(|y| (start_x..=end_x).map(move |x| (x, y)))
        .filter(|point| point_set.contains(point))
        .count();
      if filled * 4 >= area {
        cells.push((row as i32, column as i32));
      }
    }
  }
  if cells.len() != 4 {
    return Err("机巧石轮廓不是四格形状".to_string());
  }
  Ok(ShapeMask::from_cells(cells))
}

pub fn classify_shape_image(image: &DynamicImage) -> StoneShape {
  let rgba = image.to_rgba8();
  let width = rgba.width() as usize;
  let height = rgba.height() as usize;
  let raw_points = rgba
    .enumerate_pixels()
    .filter_map(|(x, y, pixel)| {
      let [red, green, blue, alpha] = pixel.0;
      let maximum = red.max(green).max(blue);
      let minimum = red.min(green).min(blue);
      let chroma = maximum.saturating_sub(minimum);
      let green_stone = green > 34
        && green > red.saturating_add(5)
        && green > blue.saturating_add(2);
      let gray_stone = minimum > 88 && chroma < 34;
      (alpha > 0 && (green_stone || gray_stone))
        .then_some((x, y))
    })
    .collect::<Vec<_>>();
  if raw_points.len() < 24 {
    return StoneShape::Unknown;
  }
  let mut dilated = vec![false; width * height];
  for (x, y) in &raw_points {
    let x = *x as usize;
    let y = *y as usize;
    for dy in y.saturating_sub(4)..=(y + 4).min(height - 1) {
      for dx in x.saturating_sub(4)..=(x + 4).min(width - 1) {
        dilated[dy * width + dx] = true;
      }
    }
  }
  let mut labels = vec![usize::MAX; width * height];
  let mut component_sizes = Vec::new();
  for start in 0..dilated.len() {
    if !dilated[start] || labels[start] != usize::MAX {
      continue;
    }
    let label = component_sizes.len();
    let mut stack = vec![start];
    labels[start] = label;
    let mut size = 0;
    while let Some(index) = stack.pop() {
      size += 1;
      let x = index % width;
      let y = index / width;
      for neighbor_y in y.saturating_sub(1)..=(y + 1).min(height - 1) {
        for neighbor_x in x.saturating_sub(1)..=(x + 1).min(width - 1) {
          let neighbor = neighbor_y * width + neighbor_x;
          if dilated[neighbor] && labels[neighbor] == usize::MAX {
            labels[neighbor] = label;
            stack.push(neighbor);
          }
        }
      }
    }
    component_sizes.push(size);
  }
  let Some((largest_label, _)) = component_sizes
    .iter()
    .enumerate()
    .max_by_key(|(_, size)| **size)
  else {
    return StoneShape::Unknown;
  };
  let mut points = raw_points
    .into_iter()
    .filter(|(x, y)| labels[*y as usize * width + *x as usize] == largest_label)
    .collect::<Vec<_>>();
  if points.len() < 24 {
    return StoneShape::Unknown;
  }
  let mut xs = points.iter().map(|(x, _)| *x).collect::<Vec<_>>();
  let mut ys = points.iter().map(|(_, y)| *y).collect::<Vec<_>>();
  xs.sort_unstable();
  ys.sort_unstable();
  let low = points.len() / 50;
  let high = points.len().saturating_sub(low + 1);
  let (left, right, top, bottom) = (xs[low], xs[high], ys[low], ys[high]);
  if right <= left || bottom <= top {
    return StoneShape::Unknown;
  }
  points.retain(|(x, y)| *x >= left && *x <= right && *y >= top && *y <= bottom);
  let actual_aspect = (right - left).max(1) as f32 / (bottom - top).max(1) as f32;

  const SIZE: usize = 20;
  let mut raster = vec![false; SIZE * SIZE];
  for (x, y) in points {
    let nx = (((x - left) as f32 / (right - left).max(1) as f32)
      * (SIZE - 1) as f32)
      .round() as usize;
    let ny = (((y - top) as f32 / (bottom - top).max(1) as f32)
      * (SIZE - 1) as f32)
      .round() as usize;
    for dy in ny.saturating_sub(1)..=(ny + 1).min(SIZE - 1) {
      for dx in nx.saturating_sub(1)..=(nx + 1).min(SIZE - 1) {
        raster[dy * SIZE + dx] = true;
      }
    }
  }

  let templates = [
    (StoneShape::Square, vec![(0, 0), (0, 1), (1, 0), (1, 1)]),
    (StoneShape::L, vec![(0, 0), (1, 0), (1, 1), (1, 2)]),
    (StoneShape::T, vec![(0, 0), (0, 1), (0, 2), (1, 1)]),
    (StoneShape::Line, vec![(0, 0), (0, 1), (0, 2), (0, 3)]),
    (StoneShape::J, vec![(0, 2), (1, 0), (1, 1), (1, 2)]),
  ];
  let mut best = (StoneShape::Unknown, 0.0_f32);
  for (shape, base) in templates {
    let mut cells = base;
    for _ in 0..4 {
      let minimum_row = cells.iter().map(|(row, _)| *row).min().unwrap_or(0);
      let minimum_column = cells.iter().map(|(_, column)| *column).min().unwrap_or(0);
      for (row, column) in &mut cells {
        *row -= minimum_row;
        *column -= minimum_column;
      }
      let rows = cells.iter().map(|(row, _)| *row).max().unwrap_or(0) + 1;
      let columns = cells.iter().map(|(_, column)| *column).max().unwrap_or(0) + 1;
      let expected = (0..SIZE * SIZE)
        .map(|index| {
          let row = index / SIZE;
          let column = index % SIZE;
          let cell_row = row * rows as usize / SIZE;
          let cell_column = column * columns as usize / SIZE;
          cells.contains(&(cell_row as i32, cell_column as i32))
        })
        .collect::<Vec<_>>();
      let intersection = raster
        .iter()
        .zip(&expected)
        .filter(|(actual, target)| **actual && **target)
        .count() as f32;
      let actual_count = raster.iter().filter(|value| **value).count() as f32;
      let expected_count = expected.iter().filter(|value| **value).count() as f32;
      let shape_score =
        2.0 * intersection / (actual_count + expected_count).max(1.0);
      let expected_aspect = columns as f32 / rows as f32;
      let aspect_score =
        (-(actual_aspect / expected_aspect).ln().abs() * 1.6).exp();
      let score = shape_score * aspect_score;
      if score > best.1 {
        best = (shape, score);
      }
      cells = cells
        .iter()
        .map(|(row, column)| (*column, -*row))
        .collect();
    }
  }
  (best.1 >= 0.46).then_some(best.0).unwrap_or(StoneShape::Unknown)
}

fn projection_runs(
  minimum: u32,
  maximum: u32,
  count: impl Fn(u32) -> usize,
) -> Vec<(u32, u32)> {
  let maximum_count = (minimum..=maximum)
    .map(&count)
    .max()
    .unwrap_or(0);
  let threshold = (maximum_count / 8).max(2);
  let mut runs = Vec::new();
  let mut start = None;
  for coordinate in minimum..=maximum {
    if count(coordinate) >= threshold {
      start.get_or_insert(coordinate);
    } else if let Some(run_start) = start.take() {
      runs.push((run_start, coordinate - 1));
    }
  }
  if let Some(run_start) = start {
    runs.push((run_start, maximum));
  }
  runs
}

pub fn parse_stone_text(
  id: impl Into<String>,
  tab: InventoryTabKind,
  shape: StoneShape,
  blocks: &[OcrTextBlock],
) -> ScannedStone {
  let title = blocks.iter().find(|block| block.text.contains("机巧石"));
  let title_parts = title
    .map(|block| {
      block
        .text
        .split(['·', '•'])
        .map(str::trim)
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
    })
    .unwrap_or_default();
  let text_fields = |label: &str| {
    blocks
      .iter()
      .filter_map(|block| {
        block.text.find(label).map(|index| ScannedTextField {
          raw: block.text[index + label.len()..]
            .trim()
            .trim_start_matches([':', '：'])
            .trim()
            .to_string(),
          confidence: block.confidence.clamp(0.0, 1.0),
        })
      })
      .filter(|field| !field.raw.is_empty())
      .collect::<Vec<_>>()
  };
  let marks = blocks
    .iter()
    .flat_map(|block| block.text.chars())
    .filter(|character| matches!(*character, '壹' | '贰' | '叁' | '肆' | '伍' | '陆'))
    .map(|character| character.to_string())
    .collect::<Vec<_>>();
  let confidence = blocks
    .iter()
    .map(|block| block.confidence)
    .reduce(f32::min)
    .unwrap_or(0.0)
    .clamp(0.0, 1.0);

  ScannedStone {
    id: id.into(),
    category: match tab {
      InventoryTabKind::Normal => "normal",
      InventoryTabKind::Craft => "craft",
    }
    .to_string(),
    shape,
    element_raw: title_parts.first().map(|value| (*value).to_string()),
    quality_raw: title_parts.last().and_then(|value| {
      let quality = value
        .trim_matches(|character: char| {
          character.is_whitespace()
            || matches!(character, '壹' | '贰' | '叁' | '肆' | '伍' | '陆')
        })
        .to_string();
      (quality != "机巧石" && !quality.is_empty()).then_some(quality)
    }),
    primary_attributes: text_fields("属性"),
    spirit_attributes: text_fields("灵蕴"),
    marks,
    confirmed: false,
    confidence,
  }
}

fn join_line_blocks(blocks: &[OcrTextBlock]) -> Vec<OcrTextBlock> {
  let mut lines: Vec<Vec<&OcrTextBlock>> = Vec::new();
  for block in blocks {
    if let Some(line) = lines.iter_mut().find(|line| {
      let first = line[0];
      (first.y - block.y).abs()
        <= first.height.max(block.height) * 0.65
    }) {
      line.push(block);
    } else {
      lines.push(vec![block]);
    }
  }
  lines
    .into_iter()
    .map(|mut line| {
      line.sort_by(|left, right| left.x.total_cmp(&right.x));
      let first = line[0];
      let text = line
        .iter()
        .map(|block| block.text.trim())
        .filter(|text| !text.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
      let confidence = line
        .iter()
        .map(|block| block.confidence)
        .reduce(f32::min)
        .unwrap_or(0.0);
      let right = line
        .iter()
        .map(|block| block.x + block.width)
        .fold(first.x, f32::max);
      let bottom = line
        .iter()
        .map(|block| block.y + block.height)
        .fold(first.y, f32::max);
      OcrTextBlock::new(
        text,
        first.x,
        first.y,
        right - first.x,
        bottom - first.y,
        confidence,
      )
    })
    .collect()
}
