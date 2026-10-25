# What's Your Next Move?

A Toyota Financial Services customer decision. It opens on a racing-green hatchback in Golden Valley and asks you to pick a contract. The next screen is one recommended next step. Driving the loop is optional.

Maya Chen and Jordan Hale each load a contract into the same financing offer. Home, the Dealer, and Service use that live decision, and the brighter ring is the recommended next step. Changing the price, rate, term, budget, mileage, or priority recalculates it and says what changed. The numbers come from plain rules on synthetic data, with no API key. The interest field is a nominal annual rate, not an APR.

Adjust the numbers when the budget, mileage, or offer is different. Ask explains the figures already on screen. Prepare a visit writes a summary you can edit. Test-drive, appraisal, financing, and service requests stay on this device, including a simulated failure. Month-by-month payoff, a two-offer comparison, saved scenarios, and a session recap sit under More.

## Demo

Pick Maya or Jordan on the opening card.

- Maya Chen is on a 2023 RAV4 Hybrid lease and is on pace to finish over her miles. Her next move is the dealer buyout. Open the buyout offer from that screen.
- Jordan Hale is on a 2021 Camry loan at 3.9%. Refinancing and trading in cost more than staying. His next move is the 60,000-mile service. Switch to Jordan on the answer screen.

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
