"""Verify the fork accepts the upstream Trending page's request parameters."""
import subprocess
from pathlib import Path

import yaml


def trending_parameters(document):
    operation = yaml.safe_load(document)["paths"]["/discover/trending"]["get"]
    return {(p["in"], p["name"]): p["schema"] for p in operation["parameters"]}


release = subprocess.check_output(
    ["git", "describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"], text=True
).strip()
upstream = subprocess.check_output(["git", "show", f"{release}:seerr-api.yml"])
actual = trending_parameters(Path("seerr-api.yml").read_bytes())
for key, schema in trending_parameters(upstream).items():
    if actual.get(key) != schema:
        raise SystemExit(f"Trending parameter {key} differs from upstream {release}")
