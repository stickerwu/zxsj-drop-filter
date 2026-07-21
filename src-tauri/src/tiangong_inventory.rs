use serde::{Deserialize, Serialize};
use std::collections::HashSet;

const AUTO_CAPTURE_STABLE_MS: u64 = 350;
const AUTO_CAPTURE_MOTION_THRESHOLD: u64 = 8;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum AutoCapturePhase {
  Waiting,
  Scrolling,
  Stable,
  Captured,
  Recognizing,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct AutoCaptureObservation {
  pub phase: AutoCapturePhase,
  pub stable_for_ms: u64,
  pub should_capture: bool,
}

#[derive(Clone, Debug, Default)]
pub struct AutoCaptureTracker {
  previous_signature: Option<Vec<u8>>,
  attempted_signature: Option<Vec<u8>>,
  stable_since_ms: Option<u64>,
}

fn signature_difference(left: &[u8], right: &[u8]) -> u64 {
  if left.is_empty() || left.len() != right.len() {
    return u64::MAX;
  }
  left
    .iter()
    .zip(right)
    .map(|(left, right)| left.abs_diff(*right) as u64)
    .sum::<u64>()
    / left.len() as u64
}

impl AutoCaptureTracker {
  pub fn observe(
    &mut self,
    signature: &[u8],
    observed_at_ms: u64,
  ) -> AutoCaptureObservation {
    let moved = self
      .previous_signature
      .as_deref()
      .is_some_and(|previous| {
        signature_difference(previous, signature)
          > AUTO_CAPTURE_MOTION_THRESHOLD
      });
    self.previous_signature = Some(signature.to_vec());

    if moved {
      self.stable_since_ms = Some(observed_at_ms);
      return AutoCaptureObservation {
        phase: AutoCapturePhase::Scrolling,
        stable_for_ms: 0,
        should_capture: false,
      };
    }

    let stable_since = *self.stable_since_ms.get_or_insert(observed_at_ms);
    let stable_for_ms = observed_at_ms.saturating_sub(stable_since);
    let already_attempted = self
      .attempted_signature
      .as_deref()
      .is_some_and(|attempted| {
        signature_difference(attempted, signature)
          <= AUTO_CAPTURE_MOTION_THRESHOLD
      });
    if already_attempted {
      return AutoCaptureObservation {
        phase: AutoCapturePhase::Captured,
        stable_for_ms,
        should_capture: false,
      };
    }
    if stable_for_ms >= AUTO_CAPTURE_STABLE_MS {
      return AutoCaptureObservation {
        phase: AutoCapturePhase::Stable,
        stable_for_ms,
        should_capture: true,
      };
    }
    AutoCaptureObservation {
      phase: AutoCapturePhase::Waiting,
      stable_for_ms,
      should_capture: false,
    }
  }

  pub fn mark_attempted(&mut self, signature: &[u8]) {
    self.attempted_signature = Some(signature.to_vec());
  }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameWindowCandidate {
  pub window_id: String,
  pub process_name: String,
  pub title: String,
  pub minimized: bool,
}

pub fn filter_game_windows(
  candidates: Vec<GameWindowCandidate>,
) -> Vec<GameWindowCandidate> {
  candidates
    .into_iter()
    .filter(|candidate| {
      candidate
        .process_name
        .strip_suffix(".exe")
        .unwrap_or(&candidate.process_name)
        .eq_ignore_ascii_case("ZhuxianClient-Win64-Shipping")
        && candidate.title.trim().contains("诛仙世界")
    })
    .collect()
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct PixelRect {
  pub x: u32,
  pub y: u32,
  pub width: u32,
  pub height: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub struct InventoryLayout {
  pub panel: PixelRect,
  pub list: PixelRect,
  pub columns: usize,
  pub card_width: u32,
  pub card_height: u32,
  pub column_gap: u32,
  pub row_gap: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub struct OcrTextBlock {
  pub text: String,
  pub x: f32,
  pub y: f32,
  pub width: f32,
  pub height: f32,
  pub confidence: f32,
}

impl OcrTextBlock {
  pub fn new(
    text: impl Into<String>,
    x: f32,
    y: f32,
    width: f32,
    height: f32,
    confidence: f32,
  ) -> Self {
    Self {
      text: text.into(),
      x,
      y,
      width,
      height,
      confidence,
    }
  }
}

pub fn locate_inventory_layout(
  frame_width: u32,
  frame_height: u32,
  blocks: &[OcrTextBlock],
) -> Result<InventoryLayout, String> {
  if frame_width < 1280 || frame_height < 720 {
    return Err("当前游戏分辨率过低，至少需要 1280×720".to_string());
  }

  let normal_anchor = blocks.iter().find(|block| {
    block.text.replace(' ', "").contains("机巧石")
      && block.x > frame_width as f32 * 0.55
      && block.y < frame_height as f32 * 0.25
  });
  let craft_anchor = blocks.iter().find(|block| {
    block.text.replace(' ', "").contains("匠心石")
      && block.x > frame_width as f32 * 0.55
      && block.y < frame_height as f32 * 0.25
  });
  let count_anchor = blocks.iter().find(|block| {
    let compact = block.text.replace(' ', "");
    compact
      .split_once('/')
      .is_some_and(|(count, capacity)| {
        count.chars().all(|character| character.is_ascii_digit())
          && capacity.chars().all(|character| character.is_ascii_digit())
      })
      && block.x > frame_width as f32 * 0.75
      && block.y < frame_height as f32 * 0.32
  });

  if normal_anchor.is_none() || craft_anchor.is_none() {
    return Err("未识别到机巧石与匠心石页签，请打开天工机巧盘库存页面".to_string());
  }
  if count_anchor.is_none() {
    return Err("未识别到库存总数，请确认库存面板完整可见".to_string());
  }

  let scale_x = frame_width as f32 / 2048.0;
  let scale_y = frame_height as f32 / 1152.0;
  let scaled = |value: f32, scale: f32| (value * scale).round() as u32;
  Ok(InventoryLayout {
    panel: PixelRect {
      x: scaled(1260.0, scale_x),
      y: scaled(98.0, scale_y),
      width: scaled(764.0, scale_x),
      height: scaled(972.0, scale_y),
    },
    list: PixelRect {
      x: scaled(1308.0, scale_x),
      y: scaled(241.0, scale_y),
      width: scaled(688.0, scale_x),
      height: scaled(820.0, scale_y),
    },
    columns: 3,
    card_width: scaled(211.0, scale_x),
    card_height: scaled(245.0, scale_y),
    column_gap: scaled(16.0, scale_x),
    row_gap: scaled(14.0, scale_y),
  })
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StoneShape {
  Square,
  L,
  T,
  Line,
  J,
  Craft,
  Unknown,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ShapeMask {
  cells: HashSet<(i32, i32)>,
}

impl ShapeMask {
  pub fn from_rows(rows: &[&str]) -> Self {
    let cells = rows
      .iter()
      .enumerate()
      .flat_map(|(row, values)| {
        values
          .chars()
          .enumerate()
          .filter(|(_, value)| *value == '1')
          .map(move |(column, _)| (row as i32, column as i32))
      })
      .collect();
    Self { cells }
  }

  pub fn from_cells(cells: impl IntoIterator<Item = (i32, i32)>) -> Self {
    Self {
      cells: cells.into_iter().collect(),
    }
  }

  fn normalized(&self) -> Self {
    let minimum_row = self.cells.iter().map(|(row, _)| *row).min().unwrap_or(0);
    let minimum_column = self
      .cells
      .iter()
      .map(|(_, column)| *column)
      .min()
      .unwrap_or(0);
    Self::from_cells(
      self
        .cells
        .iter()
        .map(|(row, column)| (row - minimum_row, column - minimum_column)),
    )
  }

  fn rotated(&self) -> Self {
    Self::from_cells(
      self
        .cells
        .iter()
        .map(|(row, column)| (*column, -*row)),
    )
    .normalized()
  }
}

fn mask_orientations(mask: ShapeMask) -> Vec<ShapeMask> {
  let mut orientations = Vec::new();
  let mut current = mask.normalized();
  for _ in 0..4 {
    if !orientations.contains(&current) {
      orientations.push(current.clone());
    }
    current = current.rotated();
  }
  orientations
}

pub fn classify_shape_mask(mask: &ShapeMask) -> StoneShape {
  if mask.cells.len() != 4 {
    return StoneShape::Unknown;
  }
  let templates = [
    (StoneShape::Square, ShapeMask::from_rows(&["11", "11"])),
    (StoneShape::L, ShapeMask::from_rows(&["100", "111"])),
    (StoneShape::T, ShapeMask::from_rows(&["111", "010"])),
    (StoneShape::Line, ShapeMask::from_rows(&["1111"])),
    (StoneShape::J, ShapeMask::from_rows(&["001", "111"])),
  ];
  let normalized = mask.normalized();
  templates
    .into_iter()
    .find_map(|(shape, template)| {
      mask_orientations(template)
        .contains(&normalized)
        .then_some(shape)
    })
    .unwrap_or(StoneShape::Unknown)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct VerticalRegistration {
  pub scroll_pixels: usize,
  pub overlap_rows: usize,
}

pub fn register_vertical_overlap(
  previous: &[u8],
  current: &[u8],
  width: usize,
  minimum_overlap_rows: usize,
) -> Result<VerticalRegistration, String> {
  if width == 0
    || previous.len() % width != 0
    || current.len() % width != 0
  {
    return Err("库存截图尺寸无效".to_string());
  }
  let previous_height = previous.len() / width;
  let current_height = current.len() / width;
  let maximum_scroll = previous_height.saturating_sub(minimum_overlap_rows);
  let mut best: Option<(usize, u64, usize)> = None;

  for scroll in 0..=maximum_scroll {
    let overlap_rows = (previous_height - scroll).min(current_height);
    if overlap_rows < minimum_overlap_rows {
      continue;
    }
    let previous_slice =
      &previous[scroll * width..(scroll + overlap_rows) * width];
    let current_slice = &current[..overlap_rows * width];
    let difference = previous_slice
      .iter()
      .zip(current_slice)
      .map(|(left, right)| left.abs_diff(*right) as u64)
      .sum::<u64>();
    let normalized = difference / previous_slice.len().max(1) as u64;
    if best.is_none_or(|(_, score, _)| normalized < score) {
      best = Some((scroll, normalized, overlap_rows));
    }
  }

  let Some((scroll_pixels, score, overlap_rows)) = best else {
    return Err("当前页面与上一页没有足够重叠，请向上回滚一行后重试".to_string());
  };
  if score > 18 {
    return Err("当前页面与上一页没有足够重叠，请向上回滚一行后重试".to_string());
  }
  Ok(VerticalRegistration {
    scroll_pixels,
    overlap_rows,
  })
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedTextField {
  pub raw: String,
  pub confidence: f32,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScannedStone {
  pub id: String,
  pub category: String,
  pub shape: StoneShape,
  pub element_raw: Option<String>,
  pub quality_raw: Option<String>,
  pub primary_attributes: Vec<ScannedTextField>,
  pub spirit_attributes: Vec<ScannedTextField>,
  pub marks: Vec<String>,
  pub confirmed: bool,
  pub confidence: f32,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum InventoryTabKind {
  Normal,
  Craft,
}

#[derive(Clone, Debug)]
pub struct InventoryPage {
  pub tab: InventoryTabKind,
  pub reported_count: Option<usize>,
  pub first_index: usize,
  pub items: Vec<ScannedStone>,
}

#[derive(Clone, Debug, Default, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InventoryTabState {
  pub reported_count: Option<usize>,
  pub completed: bool,
  pub items: Vec<ScannedStone>,
}

#[derive(Clone, Debug, Default)]
pub struct InventorySession {
  pub normal: InventoryTabState,
  pub craft: InventoryTabState,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TianGongInventorySnapshotV1 {
  pub version: u8,
  pub captured_at: String,
  pub normal: InventoryTabState,
  pub craft: InventoryTabState,
}

impl InventorySession {
  pub fn snapshot(&self) -> TianGongInventorySnapshotV1 {
    TianGongInventorySnapshotV1 {
      version: 1,
      captured_at: chrono::Utc::now()
        .to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
      normal: self.normal.clone(),
      craft: self.craft.clone(),
    }
  }
}

fn tab_mut(
  session: &mut InventorySession,
  tab: InventoryTabKind,
) -> &mut InventoryTabState {
  match tab {
    InventoryTabKind::Normal => &mut session.normal,
    InventoryTabKind::Craft => &mut session.craft,
  }
}

pub fn merge_page(
  session: &mut InventorySession,
  page: InventoryPage,
) -> Result<(), String> {
  let tab = tab_mut(session, page.tab);
  if !tab.items.is_empty() && page.first_index > tab.items.len() {
    return Err("当前页面与上一页没有足够重叠，请向上回滚一行后重试".to_string());
  }

  tab.reported_count = page.reported_count.or(tab.reported_count);
  for (offset, mut item) in page.items.into_iter().enumerate() {
    let index = page.first_index + offset;
    item.id = format!(
      "{}-{index}",
      match page.tab {
        InventoryTabKind::Normal => "normal",
        InventoryTabKind::Craft => "craft",
      },
    );
    item.category = match page.tab {
      InventoryTabKind::Normal => "normal",
      InventoryTabKind::Craft => "craft",
    }
    .to_string();
    if index < tab.items.len() {
      tab.items[index] = item;
    } else {
      tab.items.push(item);
    }
  }

  tab.completed = tab
    .reported_count
    .is_some_and(|reported_count| reported_count == tab.items.len());
  Ok(())
}
