from pathlib import Path
import unittest


class ProjectLayoutTests(unittest.TestCase):
    def test_python_implementation_lives_under_python_core(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        python_core = project_root / "python-core"

        self.assertTrue((python_core / "pyproject.toml").is_file())
        self.assertTrue((python_core / "server.py").is_file())
        self.assertTrue((python_core / "front_automation_mcp").is_dir())

    def test_outer_launcher_points_to_python_core(self) -> None:
        project_root = Path(__file__).resolve().parents[1]
        launcher = (project_root / "server.py").read_text()

        self.assertIn("python-core", launcher)
        self.assertIn("front_automation_mcp.server", launcher)


if __name__ == "__main__":
    unittest.main()
