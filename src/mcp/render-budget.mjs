export function assertPngFileSize(size){
 if(!Number.isSafeInteger(size)||size<0||size>8388608)throw new Error('PNG render budget exceeded');
}
export function checkRenderBudget(svg,png){
 if(Buffer.byteLength(svg,'utf8')>1048576)throw new Error('SVG render budget exceeded');
 if(png && png.byteLength>8388608)throw new Error('PNG render budget exceeded');
}
