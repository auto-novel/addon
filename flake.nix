{
  description = "AutoNovel Extension Workspace";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";

    devenv.url = "github:cachix/devenv/latest";
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

    kuriko-nur.url = "github:kurikomoe/nur-packages";
    kuriko-nur.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = inputs @ {flake-parts, ...}:
    flake-parts.lib.mkFlake {inherit inputs;} {
      imports = [
        inputs.devenv.flakeModule
      ];

      systems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin"];

      perSystem = {
        config,
        self',
        inputs',
        system,
        lib,
        ...
      }: let
        pkgs = import inputs.nixpkgs {
          inherit system;
          config.allowUnfree = true;
          overlays = [];
        };

        packageManager = "pnpm";

        runtimeLibs = with pkgs; [];
      in {
        devenv.shells.default = {
          packages = with pkgs;
            [
              hello
            ]
            ++ runtimeLibs;

          languages.typescript.enable = true;
          languages.javascript = {
            enable = true;

            "${packageManager}" = {
              enable = true;
              install.enable = true;
            };
          };

          languages.python = {
            enable = false;
            package = pkgs.python312;
            uv.enable = true;
          };

          enterShell = ''
            hello
          '';

          dotenv.enable = true;

          pre-commit.hooks = {
            alejandra.enable = true;
            shellcheck.enable = true;

            # Python
            isort.enable = true;
            pylint.enable = true;

            # JS
            eslint.enable = true;

            # Check Secrets
            trufflehog = {
              enable = true;
              entry = builtins.toString inputs.kuriko-nur.legacyPackages.${system}.precommit-trufflehog;
              stages = ["pre-push" "pre-commit"];
            };
          };
        };
      };

      flake = {};
    };
}
