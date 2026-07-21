pub mod tiangong_capture;
pub mod tiangong_inventory;
pub mod tiangong_ocr;
pub mod tiangong_scan;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(tiangong_scan::TianGongScanState::default())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      tiangong_scan::list_tiangong_game_windows,
      tiangong_scan::begin_tiangong_inventory_scan,
      tiangong_scan::probe_tiangong_inventory_scan,
      tiangong_scan::capture_tiangong_inventory_page,
      tiangong_scan::finish_tiangong_inventory_scan,
      tiangong_scan::cancel_tiangong_inventory_scan,
      tiangong_scan::load_tiangong_inventory,
      tiangong_scan::save_tiangong_inventory,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
