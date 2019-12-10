use wasm_bindgen::prelude::*;

mod grid;
mod maxwell;
mod operators;
pub use crate::maxwell::{System, WorkBuffers};
pub(crate) use grid::Grid;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub fn set_panic_hook() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct Universe {
    sys: (System, System),
    wb: WorkBuffers,
    grid: Grid<operators::Upwind4>,
}

#[wasm_bindgen]
impl Universe {
    #[wasm_bindgen(constructor)]
    pub fn new(width: u32, height: u32, x: &[f32], y: &[f32]) -> Self {
        assert_eq!((width * height) as usize, x.len());
        assert_eq!((width * height) as usize, y.len());

        let grid = Grid::new(width, height, x, y).expect(
            "Could not create grid. Different number of elements compared to width*height?",
        );
        Self {
            sys: (System::new(width, height), System::new(width, height)),
            grid,
            wb: WorkBuffers::new(width as usize, height as usize),
        }
    }

    pub fn init(&mut self, x0: f32, y0: f32) {
        self.sys.0.set_gaussian(x0, y0);
    }

    pub fn advance(&mut self, dt: f32) {
        System::advance::<operators::Upwind4>(
            &self.sys.0,
            &mut self.sys.1,
            dt,
            &self.grid,
            Some(&mut self.wb),
        );
        std::mem::swap(&mut self.sys.0, &mut self.sys.1);
    }

    pub fn get_ex_ptr(&mut self) -> *mut u8 {
        self.sys.0.ex.as_mut_ptr() as *mut u8
    }

    pub fn get_ey_ptr(&mut self) -> *mut u8 {
        self.sys.0.ey.as_mut_ptr() as *mut u8
    }

    pub fn get_hz_ptr(&mut self) -> *mut u8 {
        self.sys.0.hz.as_mut_ptr() as *mut u8
    }
}
