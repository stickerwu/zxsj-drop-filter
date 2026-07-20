use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_global_shortcut::{
  GlobalShortcutExt,
  ShortcutState,
};
use uuid::Uuid;

use crate::tiangong_capture::{
  capture_game_window,
  enumerate_game_windows,
};
use crate::tiangong_inventory::{
  merge_page,
  register_vertical_overlap,
  GameWindowCandidate,
  InventorySession,
  InventoryTabKind,
  TianGongInventorySnapshotV1,
};
use crate::tiangong_ocr::{
  InventoryOcrEngine,
  RecognizedInventoryPage,
};

const HOTKEY: &str = "Ctrl+Shift+F8";
const INVENTORY_FILE: &str = "tiangong-inventory-v1.json";

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BeginScanResult {
  pub session_id: String,
  pub window: GameWindowCandidate,
  pub snapshot: TianGongInventorySnapshotV1,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyPayload {
  session_id: String,
}

#[derive(Clone)]
struct PreviousPage {
  gray: Vec<u8>,
  width: usize,
  row_pitch: usize,
  first_index: usize,
}

struct ActiveScan {
  session_id: String,
  window_id: String,
  frame_size: Option<(u32, u32)>,
  inventory: InventorySession,
  previous: HashMap<InventoryTabKind, PreviousPage>,
  busy: bool,
  muted: bool,
}

pub struct TianGongScanState {
  active: Mutex<Option<ActiveScan>>,
  ocr: Mutex<Option<Arc<InventoryOcrEngine>>>,
}

impl Default for TianGongScanState {
  fn default() -> Self {
    Self {
      active: Mutex::new(None),
      ocr: Mutex::new(None),
    }
  }
}

fn select_window(window_id: Option<&str>) -> Result<GameWindowCandidate, String> {
  let windows = enumerate_game_windows()?;
  match window_id {
    Some(id) => windows
      .into_iter()
      .find(|window| window.window_id == id)
      .ok_or_else(|| "选择的游戏窗口已关闭".to_string()),
    None if windows.len() == 1 => Ok(windows.into_iter().next().unwrap()),
    None if windows.is_empty() => Err("未检测到正在运行的诛仙世界游戏窗口".to_string()),
    None => Err("检测到多个游戏窗口，请先选择要扫描的窗口".to_string()),
  }
}

fn ocr_engine(
  app: &AppHandle,
  state: &TianGongScanState,
) -> Result<Arc<InventoryOcrEngine>, String> {
  let mut slot = state.ocr.lock().map_err(|_| "OCR 状态已损坏".to_string())?;
  if let Some(engine) = slot.as_ref() {
    return Ok(engine.clone());
  }
  let resource_dir = app
    .path()
    .resource_dir()
    .map_err(|error| format!("无法定位 OCR 资源目录：{error}"))?
    .join("resources/ocr");
  let engine = Arc::new(InventoryOcrEngine::load(&resource_dir)?);
  *slot = Some(engine.clone());
  Ok(engine)
}

fn unregister_hotkey(app: &AppHandle) {
  let _ = app.global_shortcut().unregister(HOTKEY);
}

#[tauri::command]
pub fn list_tiangong_game_windows() -> Result<Vec<GameWindowCandidate>, String> {
  enumerate_game_windows()
}

#[tauri::command]
pub fn begin_tiangong_inventory_scan(
  app: AppHandle,
  state: State<'_, TianGongScanState>,
  window_id: Option<String>,
  muted: Option<bool>,
) -> Result<BeginScanResult, String> {
  let window = select_window(window_id.as_deref())?;
  let _ = ocr_engine(&app, &state)?;
  let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
  if active.is_some() {
    return Err("已有库存扫描会话正在进行".to_string());
  }
  let session_id = Uuid::new_v4().to_string();
  let inventory = InventorySession::default();
  *active = Some(ActiveScan {
    session_id: session_id.clone(),
    window_id: window.window_id.clone(),
    frame_size: None,
    inventory,
    previous: HashMap::new(),
    busy: false,
    muted: muted.unwrap_or(false),
  });
  drop(active);

  app
    .global_shortcut()
    .on_shortcut(HOTKEY, move |app, _, event| {
      if event.state() != ShortcutState::Pressed {
        return;
      }
      let state = app.state::<TianGongScanState>();
      if let Ok(active) = state.active.lock() {
        if let Some(scan) = active.as_ref() {
          let _ = app.emit(
            "tiangong-inventory-hotkey",
            HotkeyPayload {
              session_id: scan.session_id.clone(),
            },
          );
        }
      };
    })
    .map_err(|error| {
      let mut active = state.active.lock().ok();
      if let Some(slot) = active.as_mut() {
        **slot = None;
      }
      format!("全局热键 Ctrl+Shift+F8 注册失败：{error}")
    })?;

  Ok(BeginScanResult {
    session_id,
    window,
    snapshot: InventorySession::default().snapshot(),
  })
}

fn merge_recognized(
  active: &mut ActiveScan,
  mut recognized: RecognizedInventoryPage,
) -> Result<TianGongInventorySnapshotV1, String> {
  let tab = recognized.page.tab;
  if let Some(previous) = active.previous.get(&tab) {
    if previous.width != recognized.list_width {
      return Err("游戏分辨率或界面缩放已变化，请重新开始扫描".to_string());
    }
    let registration = register_vertical_overlap(
      &previous.gray,
      &recognized.list_gray,
      previous.width,
      previous.row_pitch.max(1),
    )?;
    let rows = (registration.scroll_pixels as f32
      / previous.row_pitch.max(1) as f32)
      .round() as usize;
    recognized.page.first_index = previous.first_index + rows * 3;
  }
  let first_index = recognized.page.first_index;
  merge_page(&mut active.inventory, recognized.page)?;
  active.previous.insert(tab, PreviousPage {
    gray: recognized.list_gray,
    width: recognized.list_width,
    row_pitch: recognized.row_pitch_gray,
    first_index,
  });
  Ok(active.inventory.snapshot())
}

#[tauri::command]
pub fn capture_tiangong_inventory_page(
  app: AppHandle,
  state: State<'_, TianGongScanState>,
  session_id: String,
) -> Result<TianGongInventorySnapshotV1, String> {
  let (window_id, muted) = {
    let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
    let scan = active.as_mut().ok_or_else(|| "扫描会话已关闭".to_string())?;
    if scan.session_id != session_id {
      return Err("扫描结果已过期，请重新开始".to_string());
    }
    if scan.busy {
      return Err("上一页仍在识别，请稍候".to_string());
    }
    scan.busy = true;
    (scan.window_id.clone(), scan.muted)
  };

  let result = (|| {
    let frame = capture_game_window(&window_id)?;
    {
      let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
      let scan = active.as_mut().ok_or_else(|| "扫描会话已关闭".to_string())?;
      if scan.session_id != session_id {
        return Err("扫描结果已过期，请重新开始".to_string());
      }
      if let Some(size) = scan.frame_size {
        if size != (frame.width, frame.height) {
          return Err("游戏分辨率已变化，请重新开始扫描".to_string());
        }
      } else {
        scan.frame_size = Some((frame.width, frame.height));
      }
    }
    let recognized = ocr_engine(&app, &state)?.recognize_page(&frame)?;
    let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
    let scan = active.as_mut().ok_or_else(|| "扫描会话已关闭".to_string())?;
    if scan.session_id != session_id {
      return Err("扫描结果已过期，请重新开始".to_string());
    }
    merge_recognized(scan, recognized)
  })();

  if let Ok(mut active) = state.active.lock() {
    if let Some(scan) = active.as_mut().filter(|scan| scan.session_id == session_id) {
      scan.busy = false;
    }
  }
  if !muted {
    let kind = if result.is_ok() { 0x00000000 } else { 0x00000030 };
    unsafe {
      let _ = windows::Win32::System::Diagnostics::Debug::MessageBeep(
        windows::Win32::UI::WindowsAndMessaging::MESSAGEBOX_STYLE(kind),
      );
    }
  }
  result
}

#[tauri::command]
pub fn finish_tiangong_inventory_scan(
  app: AppHandle,
  state: State<'_, TianGongScanState>,
  session_id: String,
) -> Result<TianGongInventorySnapshotV1, String> {
  let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
  let scan = active.as_ref().ok_or_else(|| "扫描会话已关闭".to_string())?;
  if scan.session_id != session_id {
    return Err("扫描会话已过期".to_string());
  }
  let snapshot = scan.inventory.snapshot();
  *active = None;
  unregister_hotkey(&app);
  Ok(snapshot)
}

#[tauri::command]
pub fn cancel_tiangong_inventory_scan(
  app: AppHandle,
  state: State<'_, TianGongScanState>,
  session_id: Option<String>,
) -> Result<(), String> {
  let mut active = state.active.lock().map_err(|_| "扫描状态已损坏".to_string())?;
  if let (Some(expected), Some(scan)) = (session_id.as_deref(), active.as_ref()) {
    if expected != scan.session_id {
      return Ok(());
    }
  }
  *active = None;
  unregister_hotkey(&app);
  Ok(())
}

fn inventory_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
  let directory = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("无法定位应用数据目录：{error}"))?;
  std::fs::create_dir_all(&directory)
    .map_err(|error| format!("创建应用数据目录失败：{error}"))?;
  Ok(directory.join(INVENTORY_FILE))
}

#[tauri::command]
pub fn load_tiangong_inventory(
  app: AppHandle,
) -> Result<Option<TianGongInventorySnapshotV1>, String> {
  let path = inventory_path(&app)?;
  if !path.exists() {
    return Ok(None);
  }
  let bytes = std::fs::read(path).map_err(|error| format!("读取库存清单失败：{error}"))?;
  serde_json::from_slice(&bytes)
    .map(Some)
    .map_err(|error| format!("库存清单格式无效：{error}"))
}

#[tauri::command]
pub fn save_tiangong_inventory(
  app: AppHandle,
  snapshot: TianGongInventorySnapshotV1,
) -> Result<(), String> {
  if snapshot.version != 1 {
    return Err("不支持的库存清单版本".to_string());
  }
  let path = inventory_path(&app)?;
  let bytes = serde_json::to_vec_pretty(&snapshot)
    .map_err(|error| format!("序列化库存清单失败：{error}"))?;
  std::fs::write(path, bytes).map_err(|error| format!("保存库存清单失败：{error}"))
}
