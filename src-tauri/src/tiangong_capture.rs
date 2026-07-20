use std::ffi::c_void;
use std::sync::mpsc::{self, SyncSender};
use std::time::Duration;

use windows::Win32::Foundation::HWND;
use windows::Win32::UI::WindowsAndMessaging::IsIconic;
use windows_capture::capture::{Context, GraphicsCaptureApiHandler};
use windows_capture::frame::Frame;
use windows_capture::graphics_capture_api::InternalCaptureControl;
use windows_capture::settings::{
  ColorFormat,
  CursorCaptureSettings,
  DirtyRegionSettings,
  DrawBorderSettings,
  MinimumUpdateIntervalSettings,
  SecondaryWindowSettings,
  Settings,
};
use windows_capture::window::Window;

use crate::tiangong_inventory::{
  filter_game_windows,
  GameWindowCandidate,
};

#[derive(Clone, Debug)]
pub struct CapturedGameFrame {
  pub width: u32,
  pub height: u32,
  pub rgba: Vec<u8>,
}

impl CapturedGameFrame {
  pub fn is_black(&self) -> bool {
    if self.rgba.is_empty() {
      return true;
    }
    let visible = self
      .rgba
      .chunks_exact(4)
      .step_by(64)
      .filter(|pixel| pixel[0] > 4 || pixel[1] > 4 || pixel[2] > 4)
      .count();
    visible < 16
  }
}

struct OneFrameCapture {
  sender: SyncSender<Result<CapturedGameFrame, String>>,
}

impl GraphicsCaptureApiHandler for OneFrameCapture {
  type Flags = SyncSender<Result<CapturedGameFrame, String>>;
  type Error = String;

  fn new(ctx: Context<Self::Flags>) -> Result<Self, Self::Error> {
    Ok(Self { sender: ctx.flags })
  }

  fn on_frame_arrived(
    &mut self,
    frame: &mut Frame,
    capture_control: InternalCaptureControl,
  ) -> Result<(), Self::Error> {
    let width = frame.width();
    let height = frame.height();
    let result = (|| {
      let mut frame_buffer = frame.buffer().map_err(|error| error.to_string())?;
      let bgra = frame_buffer
        .as_nopadding_buffer()
        .map_err(|error| error.to_string())?;
      let mut rgba = bgra.to_vec();
      for pixel in rgba.chunks_exact_mut(4) {
        pixel.swap(0, 2);
      }
      Ok(CapturedGameFrame { width, height, rgba })
    })();
    let _ = self.sender.send(result);
    capture_control.stop();
    Ok(())
  }
}

fn raw_window_id(window: Window) -> String {
  (window.as_raw_hwnd() as usize).to_string()
}

fn parse_window_id(window_id: &str) -> Result<Window, String> {
  let raw = window_id
    .parse::<usize>()
    .map_err(|_| "游戏窗口标识无效".to_string())?;
  Ok(Window::from_raw_hwnd(raw as *mut c_void))
}

pub fn enumerate_game_windows() -> Result<Vec<GameWindowCandidate>, String> {
  let candidates = Window::enumerate()
    .map_err(|error| format!("枚举窗口失败：{error}"))?
    .into_iter()
    .filter_map(|window| {
      let process_name = window.process_name().ok()?;
      let title = window.title().ok()?;
      let minimized = unsafe { IsIconic(HWND(window.as_raw_hwnd())) }.as_bool();
      Some(GameWindowCandidate {
        window_id: raw_window_id(window),
        process_name,
        title,
        minimized,
      })
    })
    .collect();
  Ok(filter_game_windows(candidates))
}

pub fn capture_game_window(window_id: &str) -> Result<CapturedGameFrame, String> {
  let window = parse_window_id(window_id)?;
  if unsafe { IsIconic(HWND(window.as_raw_hwnd())) }.as_bool() {
    return Err("游戏窗口已最小化，请恢复窗口后重试".to_string());
  }

  let (sender, receiver) = mpsc::sync_channel(1);
  let settings = Settings::new(
    window,
    CursorCaptureSettings::WithoutCursor,
    DrawBorderSettings::WithoutBorder,
    SecondaryWindowSettings::Exclude,
    MinimumUpdateIntervalSettings::Default,
    DirtyRegionSettings::Default,
    ColorFormat::Bgra8,
    sender,
  );
  let control = OneFrameCapture::start_free_threaded(settings)
    .map_err(|error| format!("启动游戏窗口捕获失败：{error}"))?;
  let received = receiver.recv_timeout(Duration::from_secs(3));

  match received {
    Ok(result) => {
      control
        .wait()
        .map_err(|error| format!("结束游戏窗口捕获失败：{error}"))?;
      let frame = result?;
      if frame.is_black() {
        return Err("捕获到黑帧，请确认游戏窗口未最小化且界面可见".to_string());
      }
      Ok(frame)
    }
    Err(_) => {
      let _ = control.stop();
      Err("游戏窗口捕获超时".to_string())
    }
  }
}
