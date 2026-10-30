"""Reproduce all artifacts in dependency order from attributed cached sources."""
from pipeline import ingest, spatial, build, shot_model
from scripts.build_standalone import main as build_standalone
if __name__=='__main__':
    ingest.main()
    spatial.main()
    build.main()
    shot_model.main()
    build_standalone()
