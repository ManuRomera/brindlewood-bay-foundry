// Native artwork: 440 × 170. Each spine is 35 px thick, so upper
// volumes cover the board below without covering its foil title.
export function caseBookPlacement(index, sceneWidth = 1672, sceneHeight = 941) {
  const scale = Math.min(sceneWidth / 1672, sceneHeight / 941);
  return {
    x: 110 * scale,
    y: (760 - Math.max(index, 0) * 35) * scale,
    width: 440 * scale,
    height: 170 * scale,
    rotation: 0,
    sort: Math.max(index, 0) + 1,
    hidden: index < 0,
    alpha: index < 0 ? 0 : 1,
  };
}
