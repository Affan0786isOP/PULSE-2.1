# Rive Assets

This directory is intended for `.riv` animation assets used by `@rive-app/react-canvas`.

## Integration Status
Currently, no `.riv` files are provided, but the integration in `src/components/RiveFeedback.tsx` is built to handle:
- graceful degradation (fallback)
- prefers-reduced-motion
- state machine triggers (SUCCESS, NEW_BEST, etc.)

## How to add the asset
1. Place your Rive file here (e.g., `reward.riv`).
2. Update the `src` path in `src/components/RiveFeedback.tsx` if the filename differs.
3. Ensure the state machine name and inputs match those configured in `RiveFeedback.tsx`.
