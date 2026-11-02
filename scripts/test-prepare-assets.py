"""Deterministic asset pipeline regression. No original project images are edited."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

SCRIPT=Path(__file__).with_name('prepare-assets.py')

class PreparedAssets(unittest.TestCase):
    def test_transparency_cache_and_no_originals_in_output(self):
        with tempfile.TemporaryDirectory(prefix='three-kingdoms-assets-') as tmp:
            root=Path(tmp); source=root/'source'; target=root/'stage'; cache=root/'cache'
            folder=source/'assets/characters'; folder.mkdir(parents=True)
            image=Image.new('RGBA',(64,96),(174,43,52,255)); image.putpixel((0,0),(0,0,0,0)); image.putpixel((1,0),(77,88,99,128)); image.save(folder/'person.png')
            (source/'audio.mp3').write_bytes(b'original audio')
            (folder/'person.prompt.txt').write_text('retained source prompt',encoding='utf-8')
            before=hashlib.sha256((folder/'person.png').read_bytes()).hexdigest()
            args=[sys.executable,str(SCRIPT),'--source',str(source),'--output',str(target),'--cache',str(cache)]
            subprocess.run(args,check=True,capture_output=True,text=True)
            result=target/'assets/characters/person.webp'; first=result.read_bytes(); stamp=result.stat().st_mtime_ns
            decoded=Image.open(result).convert('RGBA')
            self.assertEqual(decoded.size,(64,96)); self.assertEqual(decoded.getchannel('A').tobytes(),image.getchannel('A').tobytes())
            self.assertFalse(list(target.rglob('*.png'))); self.assertFalse(list(target.rglob('*.prompt.txt')))
            self.assertEqual((target/'audio.mp3').read_bytes(),b'original audio')
            self.assertEqual(hashlib.sha256((folder/'person.png').read_bytes()).hexdigest(),before)
            subprocess.run(args,check=True,capture_output=True,text=True)
            self.assertEqual(result.read_bytes(),first); self.assertEqual(result.stat().st_mtime_ns,stamp)
            manifest=json.loads((target/'asset-manifest.json').read_text())
            self.assertEqual(manifest['images'][0]['sourceSha256'],before)
            (folder/'person.png').unlink()
            subprocess.run(args,check=True,capture_output=True,text=True)
            self.assertFalse(result.exists())

    def test_rejects_a_stage_inside_sources(self):
        with tempfile.TemporaryDirectory(prefix='three-kingdoms-assets-') as tmp:
            root=Path(tmp)
            run=subprocess.run([sys.executable,str(SCRIPT),'--source',str(root),'--output',str(root/'nested'),'--cache',str(root/'cache')],capture_output=True,text=True)
            self.assertNotEqual(run.returncode,0)
            self.assertIn('separate',run.stderr)

if __name__=='__main__': unittest.main()
