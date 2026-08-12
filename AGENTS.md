# Workspace instructions

- This repository is developed inside WSL Ubuntu at `/home/soham/projects/rsc-wrapper-component`.
- Always use the native WSL Node.js and package-manager toolchain. Do not invoke Windows Node.js, npm, pnpm, or executables under `/mnt/c` for repository development.
- The current native Node.js binary is available under `/home/soham/.nvm/versions/node/`.
- Architecture is derived iteratively from local convergence points: write the pseudo-workflow of the upper service, derive downstream contracts from its calls, then move both down and back up the service graph to improve ergonomics and lifecycle ownership.
- Use Effect v4 services and locally completed layers. Keep pure transformations as functions rather than services.
