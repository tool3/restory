import importlib.util
import json
import os
import sys

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('git_filter_repo', os.path.join(here, 'git-filter-repo.py'))
fr = importlib.util.module_from_spec(spec)
sys.modules['git_filter_repo'] = fr
spec.loader.exec_module(fr)

with open(sys.argv[1], encoding='utf-8') as plan_file:
    plan = {
        sha.encode(): {field: value.encode() for field, value in fields.items()}
        for sha, fields in json.load(plan_file).items()
    }


def rewrite(commit, metadata):
    for field, value in plan.get(commit.original_id, {}).items():
        setattr(commit, field, value)


args = fr.FilteringOptions.parse_args(['--force', '--quiet', '--keep-origin', '--replace-refs', 'delete-no-add'])
fr.RepoFilter(args, commit_callback=rewrite).run()
