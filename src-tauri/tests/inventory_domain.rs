use app_lib::tiangong_inventory::{
  AutoCapturePhase,
  AutoCaptureTracker,
  classify_shape_mask,
  filter_game_windows,
  locate_inventory_layout,
  merge_page,
  register_vertical_overlap,
  GameWindowCandidate,
  InventoryPage,
  InventorySession,
  InventoryTabKind,
  OcrTextBlock,
  ScannedStone,
  ShapeMask,
  StoneShape,
};
use app_lib::tiangong_capture::{
  capture_game_window,
  enumerate_game_windows,
  inventory_motion_signature,
  CapturedGameFrame,
};
use app_lib::tiangong_ocr::{
  extract_shape_mask,
  classify_shape_image,
  parse_inventory_header,
  parse_stone_text,
  InventoryOcrEngine,
};
use image::{DynamicImage, Rgba, RgbaImage};

fn stone(id: &str, shape: StoneShape) -> ScannedStone {
  ScannedStone {
    id: id.to_string(),
    category: "normal".to_string(),
    shape,
    element_raw: Some("火".to_string()),
    quality_raw: Some("良".to_string()),
    primary_attributes: vec![],
    spirit_attributes: vec![],
    marks: vec![],
    confirmed: false,
    confidence: 0.95,
  }
}

#[test]
fn merge_page_preserves_identical_items_at_different_global_positions() {
  let identical = stone("capture-a", StoneShape::L);
  let mut session = InventorySession::default();

  merge_page(
    &mut session,
    InventoryPage {
      tab: InventoryTabKind::Normal,
      reported_count: Some(4),
      first_index: 0,
      items: vec![
        identical.clone(),
        ScannedStone { id: "capture-b".into(), ..identical.clone() },
        ScannedStone { id: "capture-c".into(), ..identical.clone() },
      ],
    },
  )
  .expect("first page should merge");

  merge_page(
    &mut session,
    InventoryPage {
      tab: InventoryTabKind::Normal,
      reported_count: Some(4),
      first_index: 2,
      items: vec![
        ScannedStone { id: "capture-c-new".into(), ..identical.clone() },
        ScannedStone { id: "capture-d".into(), ..identical },
      ],
    },
  )
  .expect("overlapping page should merge");

  assert_eq!(session.normal.items.len(), 4);
  assert_eq!(
    session.normal.items.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(),
    vec!["normal-0", "normal-1", "normal-2", "normal-3"],
  );
}

#[test]
fn merge_page_rejects_a_gap_between_pages() {
  let mut session = InventorySession::default();
  merge_page(
    &mut session,
    InventoryPage {
      tab: InventoryTabKind::Normal,
      reported_count: Some(6),
      first_index: 0,
      items: vec![stone("a", StoneShape::Square), stone("b", StoneShape::T)],
    },
  )
  .expect("first page should merge");

  let error = merge_page(
    &mut session,
    InventoryPage {
      tab: InventoryTabKind::Normal,
      reported_count: Some(6),
      first_index: 4,
      items: vec![stone("e", StoneShape::Line)],
    },
  )
  .expect_err("missing overlap must be rejected");

  assert!(error.contains("重叠"));
}

#[test]
fn completed_tab_requires_all_reported_items() {
  let mut session = InventorySession::default();
  merge_page(
    &mut session,
    InventoryPage {
      tab: InventoryTabKind::Craft,
      reported_count: Some(1),
      first_index: 0,
      items: vec![ScannedStone {
        id: "craft".into(),
        category: "craft".into(),
        shape: StoneShape::Craft,
        element_raw: None,
        quality_raw: None,
        primary_attributes: vec![],
        spirit_attributes: vec![],
        marks: vec![],
        confirmed: true,
        confidence: 1.0,
      }],
    },
  )
  .expect("craft page should merge");

  assert!(session.craft.completed);
  assert!(!session.normal.completed);
}

#[test]
fn inventory_snapshot_uses_zulu_iso_datetime() {
  let snapshot = InventorySession::default().snapshot();

  assert!(
    snapshot.captured_at.ends_with('Z'),
    "frontend datetime validation requires a Zulu timestamp, got {}",
    snapshot.captured_at,
  );
}

#[test]
fn game_window_filter_requires_the_shipping_process_and_game_title() {
  let candidates = vec![
    GameWindowCandidate {
      window_id: "1".into(),
      process_name: "ZhuxianClient-Win64-Shipping.exe".into(),
      title: "诛仙世界  ".into(),
      minimized: false,
    },
    GameWindowCandidate {
      window_id: "2".into(),
      process_name: "ZXSJBrowser.exe".into(),
      title: "诛仙世界".into(),
      minimized: false,
    },
    GameWindowCandidate {
      window_id: "3".into(),
      process_name: "ZhuxianClient-Win64-Shipping.exe".into(),
      title: "Unreal Crash Reporter".into(),
      minimized: false,
    },
    GameWindowCandidate {
      window_id: "4".into(),
      process_name: "ZhuxianClient-Win64-Shipping".into(),
      title: "诛仙世界  ".into(),
      minimized: false,
    },
  ];

  let matches = filter_game_windows(candidates);

  assert_eq!(matches.len(), 2);
  assert_eq!(matches[0].window_id, "1");
  assert_eq!(matches[1].window_id, "4");
}

#[test]
fn inventory_layout_requires_all_visible_anchor_text() {
  let anchors = vec![
    OcrTextBlock::new("机巧石", 1450.0, 124.0, 76.0, 32.0, 0.98),
    OcrTextBlock::new("匠心石", 1610.0, 124.0, 76.0, 32.0, 0.97),
    OcrTextBlock::new("42/999", 1930.0, 184.0, 70.0, 28.0, 0.99),
  ];

  let layout = locate_inventory_layout(2048, 1152, &anchors)
    .expect("valid anchors should locate the inventory panel");
  assert_eq!(layout.columns, 3);
  assert!(layout.panel.x > 1200);
  assert!(layout.list.y > 220);

  let error = locate_inventory_layout(2048, 1152, &anchors[..2])
    .expect_err("missing count anchor must reject the frame");
  assert!(error.contains("库存总数"));
}

#[test]
fn shape_masks_recognize_rotations_without_mirroring_l_and_j() {
  let l = ShapeMask::from_rows(&[
    "100",
    "111",
  ]);
  let j = ShapeMask::from_rows(&[
    "001",
    "111",
  ]);

  assert_eq!(classify_shape_mask(&l), StoneShape::L);
  assert_eq!(classify_shape_mask(&j), StoneShape::J);
  assert_ne!(classify_shape_mask(&l), classify_shape_mask(&j));
}

#[test]
fn vertical_registration_uses_overlapping_pixels_instead_of_item_fingerprints() {
  let width = 4;
  let previous = vec![
    10, 10, 10, 10,
    20, 20, 20, 20,
    30, 30, 30, 30,
    40, 40, 40, 40,
    50, 50, 50, 50,
    60, 60, 60, 60,
  ];
  let current = vec![
    30, 30, 30, 30,
    40, 40, 40, 40,
    50, 50, 50, 50,
    60, 60, 60, 60,
    70, 70, 70, 70,
    80, 80, 80, 80,
  ];

  let registration = register_vertical_overlap(
    &previous,
    &current,
    width,
    2,
  )
  .expect("four overlapping rows should register");

  assert_eq!(registration.scroll_pixels, 2);
  assert_eq!(registration.overlap_rows, 4);
}

#[test]
fn auto_capture_waits_for_the_initial_frame_to_stabilize() {
  let mut tracker = AutoCaptureTracker::default();
  let signature = vec![20; 64];

  let initial = tracker.observe(&signature, 0);
  let waiting = tracker.observe(&signature, 300);
  let stable = tracker.observe(&signature, 350);

  assert_eq!(initial.phase, AutoCapturePhase::Waiting);
  assert!(!initial.should_capture);
  assert_eq!(waiting.stable_for_ms, 300);
  assert!(!waiting.should_capture);
  assert_eq!(stable.phase, AutoCapturePhase::Stable);
  assert!(stable.should_capture);
}

#[test]
fn auto_capture_resets_stability_after_scroll_motion() {
  let mut tracker = AutoCaptureTracker::default();
  let first = vec![20; 64];
  let scrolled = vec![80; 64];

  tracker.observe(&first, 0);
  let motion = tracker.observe(&scrolled, 400);
  let waiting = tracker.observe(&scrolled, 700);
  let stable = tracker.observe(&scrolled, 750);

  assert_eq!(motion.phase, AutoCapturePhase::Scrolling);
  assert_eq!(waiting.stable_for_ms, 300);
  assert!(!waiting.should_capture);
  assert!(stable.should_capture);
}

#[test]
fn auto_capture_does_not_repeat_the_same_attempted_frame() {
  let mut tracker = AutoCaptureTracker::default();
  let signature = vec![42; 64];

  tracker.observe(&signature, 0);
  let stable = tracker.observe(&signature, 350);
  assert!(stable.should_capture);

  tracker.mark_attempted(&signature);
  let duplicate = tracker.observe(&signature, 900);

  assert_eq!(duplicate.phase, AutoCapturePhase::Captured);
  assert!(!duplicate.should_capture);
}

#[test]
fn inventory_motion_signature_ignores_the_left_side_and_tracks_the_inventory_area() {
  let mut base = CapturedGameFrame {
    width: 200,
    height: 100,
    rgba: vec![20; 200 * 100 * 4],
  };
  for pixel in base.rgba.chunks_exact_mut(4) {
    pixel[3] = 255;
  }
  let base_signature = inventory_motion_signature(&base);

  let mut left_changed = base.clone();
  for y in 0..100usize {
    for x in 0..80usize {
      let offset = (y * 200 + x) * 4;
      left_changed.rgba[offset..offset + 3].fill(220);
    }
  }
  assert_eq!(inventory_motion_signature(&left_changed), base_signature);

  let mut inventory_changed = base;
  for y in 20..90usize {
    for x in 120..190usize {
      let offset = (y * 200 + x) * 4;
      inventory_changed.rgba[offset..offset + 3].fill(220);
    }
  }
  assert_ne!(inventory_motion_signature(&inventory_changed), base_signature);
}

#[test]
fn synthetic_colored_cells_are_classified_as_an_l_piece() {
  let mut image = RgbaImage::from_pixel(120, 90, Rgba([8, 10, 12, 255]));
  for (column, row) in [(0, 0), (0, 1), (1, 1), (2, 1)] {
    for y in 12 + row * 28..34 + row * 28 {
      for x in 18 + column * 28..40 + column * 28 {
        image.put_pixel(x, y, Rgba([104, 165, 126, 255]));
      }
    }
  }

  let mask = extract_shape_mask(&DynamicImage::ImageRgba8(image.clone()))
    .expect("colored tetromino should produce a mask");

  assert_eq!(classify_shape_mask(&mask), StoneShape::L);
  assert_eq!(
    classify_shape_image(&DynamicImage::ImageRgba8(image)),
    StoneShape::L,
  );
}

#[test]
fn header_parser_detects_active_tab_and_reported_inventory_count() {
  let blocks = vec![
    OcrTextBlock::new("机巧石", 20.0, 10.0, 80.0, 28.0, 0.99),
    OcrTextBlock::new("匠心石", 130.0, 10.0, 80.0, 28.0, 0.98),
    OcrTextBlock::new("42/999", 620.0, 60.0, 70.0, 24.0, 0.96),
  ];

  let header = parse_inventory_header(&blocks, Some(InventoryTabKind::Normal))
    .expect("header should parse");

  assert_eq!(header.tab, InventoryTabKind::Normal);
  assert_eq!(header.reported_count, Some(42));
}

#[test]
fn stone_text_parser_keeps_raw_attributes_and_confidence() {
  let blocks = vec![
    OcrTextBlock::new("火·机巧石·良", 8.0, 8.0, 160.0, 24.0, 0.97),
    OcrTextBlock::new("属性 调息+1", 8.0, 132.0, 120.0, 20.0, 0.92),
    OcrTextBlock::new("灵蕴 烈火燎原+1", 8.0, 160.0, 170.0, 20.0, 0.88),
    OcrTextBlock::new("壹 贰", 150.0, 8.0, 50.0, 20.0, 0.84),
  ];

  let stone = parse_stone_text(
    "capture-1",
    InventoryTabKind::Normal,
    StoneShape::T,
    &blocks,
  );

  assert_eq!(stone.element_raw.as_deref(), Some("火"));
  assert_eq!(stone.quality_raw.as_deref(), Some("良"));
  assert_eq!(stone.primary_attributes[0].raw, "调息+1");
  assert_eq!(stone.spirit_attributes[0].raw, "烈火燎原+1");
  assert_eq!(stone.marks, vec!["壹", "贰"]);
  assert!(stone.confidence < 0.97);
}

#[test]
#[ignore = "set TIANGONG_TEST_SCREENSHOT to a local game screenshot"]
fn recognizes_a_local_inventory_screenshot_without_committing_it() {
  let screenshot = std::env::var("TIANGONG_TEST_SCREENSHOT")
    .expect("TIANGONG_TEST_SCREENSHOT must point to a local screenshot");
  let image = image::open(screenshot).expect("screenshot should open");
  let rgba = image.to_rgba8();
  let frame = app_lib::tiangong_capture::CapturedGameFrame {
    width: rgba.width(),
    height: rgba.height(),
    rgba: rgba.into_raw(),
  };
  let resource_dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
    .join("resources/ocr");
  let engine = InventoryOcrEngine::load(&resource_dir)
    .expect("bundled models should load");

  let page = engine
    .recognize_page(&frame)
    .expect("inventory screenshot should recognize");

  assert!(page.page.reported_count.is_some());
  assert!(!page.page.items.is_empty());
  assert_eq!(page.list_gray.len() % page.list_width, 0);
}

#[test]
#[ignore = "requires a running Zhuxian World game window"]
fn captures_a_non_black_frame_from_the_running_game() {
  let windows = enumerate_game_windows().expect("window enumeration should succeed");
  let target = windows.first().expect("game window should be running");
  let frame = capture_game_window(&target.window_id).expect("capture should succeed");

  assert!(frame.width >= 1920);
  assert!(frame.height >= 1080);
  assert_eq!(frame.rgba.len(), (frame.width * frame.height * 4) as usize);
  assert!(!frame.is_black());
}
