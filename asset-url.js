const moduleUrl = new URL(import.meta.url);
const outputAssetsIndex = moduleUrl.pathname.lastIndexOf('/assets/');
moduleUrl.pathname = outputAssetsIndex >= 0
  ? moduleUrl.pathname.slice(0, outputAssetsIndex + 1)
  : moduleUrl.pathname.replace(/[^/]*$/, '');
moduleUrl.search = '';
moduleUrl.hash = '';

const projectAssetBase = new URL(import.meta.env.BASE_URL, moduleUrl);

export function resolveProjectAsset(path) {
  return new URL(path.replace(/^\/+/, ''), projectAssetBase).href;
}
