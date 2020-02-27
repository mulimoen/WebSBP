#![cfg(feature = "expensive_tests")]
use ndarray::prelude::*;
use sbp::euler::*;
use sbp::Float;

fn run_with_size<SBP: sbp::operators::UpwindOperator>(size: usize) -> Float {
    let nx = size;
    let ny = size;
    let x = Array1::linspace(-5.0, 5.0, nx);
    let y = Array1::linspace(-5.0, 5.0, ny);

    let x = x.broadcast((ny, nx)).unwrap().to_owned();
    let y = y
        .reversed_axes()
        .broadcast((nx, ny))
        .unwrap()
        .reversed_axes()
        .to_owned();

    let vortex_params = VortexParameters {
        x0: -1.0,
        y0: 0.0,
        mach: 0.5,
        rstar: 0.5,
        eps: 1.0,
    };

    let mut sys = System::<SBP>::new(x, y);
    sys.vortex(0.0, vortex_params);

    let time = 0.2;
    let dt = 0.2 * Float::min(1.0 / (nx - 1) as Float, 1.0 / (ny - 1) as Float);

    let nsteps = (time / dt) as usize;
    for _ in 0..nsteps {
        sys.advance_upwind(dt);
    }

    let mut verifield = Field::new(ny, nx);
    verifield.vortex(sys.x(), sys.y(), nsteps as Float * dt, vortex_params);

    verifield.h2_err::<SBP>(sys.field())
}

#[test]
fn convergence() {
    let sizes = [25, 35, 50, 71, 100, 150, 200];
    let mut prev: Option<(usize, Float)> = None;
    println!("Size\tError(h2)\tq");
    for size in &sizes {
        print!("{:3}x{:3}", size, size);
        let e = run_with_size::<sbp::operators::Upwind4>(*size);
        print!("\t{:.10}", e);
        if let Some(prev) = prev.take() {
            let m0 = size * size;
            let e0 = e;

            let (size1, e1) = prev;
            let m1 = size1 * size1;

            let q =
                Float::log10(e0 / e1) / Float::log10((m0 as Float / m1 as Float).powf(1.0 / 2.0));
            print!("\t{}", q);
        }
        println!();
        prev = Some((*size, e));
    }
    panic!();
}
