import os
import sys
import importlib.util

def check_imports(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                path = os.path.join(root, file)
                module_name = path.replace('/', '.').replace('.py', '')
                try:
                    spec = importlib.util.spec_from_file_location(module_name, path)
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                except Exception as e:
                    print(f"Error in {path}: {e}")

check_imports('src')
