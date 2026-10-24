# What's Your Next Move?

A browser driving scene for a Toyota Financial Services customer decision. It opens on a racing-green hatchback in Golden Valley. Choose Explore the car or Explore payments, then drive the loop or skip straight to the desk.

Maya Chen and Jordan Hale each load a contract into the same financing offer. Home, the Dealer, and Service use that live decision, and the brighter ring is the recommended next step. Changing the price, rate, term, budget, mileage, or priority recalculates it and says what changed. The numbers come from plain rules on synthetic data, with no API key. The interest field is a nominal annual rate, not an APR.

Financing, Timeline, Explore, and Compare sit on the same loop. Plan holds budget, ownership costs, a buy-versus-lease horizon, trade equity, and an explicitly uncertain savings path. Ask explains the figures already on screen. The garage saves scenarios, and Prepare my visit writes a summary you can edit. Test-drive, appraisal, financing, and service requests stay on this device, including a simulated failure. Export prints the comparison. Business view lists the session events.

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
