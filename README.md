# What's Your Next Move?

A small browser driving scene for a Toyota Financial Services customer decision. A racing-green hatchback with suspension you can feel, on a looping valley road at golden hour. Drive the asphalt, cut across the grass, or splash into the lake and get set back on the road.

Slow down at Home, the Dealer, or Service. Each stop explains that option with the payment, the total, and the assumptions. The brighter ring is the recommended next step. The numbers come from plain rules on synthetic data, with no API key.

Four more stops sit on the same loop. Drive into the ring and choose Open, or use Financing, Timeline, Explore, and Compare. Those buttons drive the car along the road, and Skip travel opens the same screen. Financing, the ownership timeline, and compare all use one illustrative loan schedule. The interest field is a nominal annual rate, not an APR.

## Demo

Pick a person in the top left, then slow down inside a ring.

- Maya Chen is on a 2023 RAV4 Hybrid lease and is over her miles. Her next move is the dealer buyout. Drive to the Dealer ring on the east straight and request the quote.
- Jordan Hale is on a 2021 Camry loan at 3.9%. Refinancing and trading in cost more than staying. His next move is the 60,000-mile service. Switch to Jordan and drive to the Service ring on the north straight.

## Run

```bash
npm install
npm run dev
```

The dev server listens on [http://127.0.0.1:47331](http://127.0.0.1:47331).

## Controls

- W / Up, or the Gas button: accelerate
- S / Down, or Reverse: brake, then reverse
- A / D or the arrow keys: steer
- Space, or Brake: handbrake
- R: reset onto the road
- M, or Sound: mute the engine

Click or press a key once so the browser will play the engine.

## Credits

All models are CC0.

- Hatchback, sedan, SUV, and wheels: [Kenney Car Kit](https://kenney.nl/assets/car-kit) (CC0). License text is in `public/models/car/License.txt`.
- Trees, rocks, bushes: [Kenney Nature Kit](https://kenney.nl/assets/nature-kit)
- Houses: [Kenney City Kit Suburban](https://kenney.nl/assets/city-kit-suburban)
- Reflections: [Poly Haven — Kiara 1 Dawn](https://polyhaven.com/a/kiara_1_dawn)
