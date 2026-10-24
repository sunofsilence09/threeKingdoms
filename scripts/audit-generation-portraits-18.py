"""Read-only pixel/provenance audit of the eighteen independently generated portraits."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'docs/art/generations-portraits-18.json').read_text(encoding='utf-8'))
records = []
for item in manifest['portraits']:
    path = ROOT / item['assetPath']
    source = Path(item['sourcePath'])
    data = path.read_bytes()
    with Image.open(path) as image:
        assert image.mode == 'RGBA', item['id']
        width, height = image.size
        alpha = image.getchannel('A')
        bounds = alpha.point(lambda value: 255 if value > 200 else 0).getbbox()
        corners = [alpha.getpixel(point) for point in [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]]
        # Built-in output can retain 1/255 alpha dither; record exact samples without modifying the image.
        assert max(corners) <= 1, item['id']
        assert bounds and 0 < bounds[0] < bounds[2] < width and 0 < bounds[1] < bounds[3] < height, item['id']
        assert source.read_bytes() == data, item['id']
        histogram = alpha.histogram()
        records.append({
            'id': item['id'], 'assetPath': item['assetPath'], 'sourcePath': item['sourcePath'],
            'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data), 'mode': image.mode,
            'width': width, 'height': height, 'alphaRange': alpha.getextrema(),
            'alphaAnyBoundingBox': alpha.getbbox(), 'alphaAbove200BoundingBox': bounds,
            'effectiveMargins': [bounds[0], bounds[1], width - bounds[2], height - bounds[3]],
            'cornerAlpha': corners, 'allCornersExactlyZero': corners == [0, 0, 0, 0],
            'cornerAlphaTolerance': 1, 'transparentPixels': histogram[0],
            'sourcePreservedAndUnmodified': True, 'visualReview': item['visualReview'],
        })
assert len(records) == 18 and len({record['sha256'] for record in records}) == 18
audit = {'date': '2026-10-24', 'generatedWith': 'built-in image_gen__imagegen, eighteen separate generation calls',
         'edgePolicy': manifest['reviewPolicy'], 'count': len(records), 'uniqueHashes': 18, 'portraits': records}
output = ROOT / 'docs/art/generations-portraits-18-audit.json'
output.write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'count': len(records), 'uniqueHashes': 18, 'audit': str(output),
                  'effectiveMargins': {record['id']: record['effectiveMargins'] for record in records}}, ensure_ascii=False))
