const isWideChar = (value: string) : boolean => {
  const utfPoint: number = value.charCodeAt(0);
  return 12288 <= utfPoint && utfPoint <= 40959;
}

const equalWidthLength = (value: string, widthRate?: {narrow: number, wide: number}): {fullSpaceRemain: number, length: number} => {
  const {narrow: narrowRate, wide: wideRate} = widthRate === undefined ? {narrow: 1, wide: 2} : widthRate;

  let fullSpaceCount: number = 0;
  let wideCharLength: number = 0;
  let narrowCount: number = 0;
  for (const c of value) {
    if (isWideChar(c)) {
      wideCharLength += fullSpaceCount === 0 ? 1 : 0;
      fullSpaceCount = fullSpaceCount === 0 ? narrowRate - 1 : fullSpaceCount - 1;
    } else {
      narrowCount += 1;
    }
  }

  return {
    fullSpaceRemain: fullSpaceCount,
    length: narrowCount + wideCharLength * wideRate
  };
}

export const equalWidthFormat = (value: string, dight: number, option?: {widthRate?: {narrow: number, wide: number}, zeroPadding?: boolean, cut?: boolean}): string => {
  const {fullSpaceRemain, length} = equalWidthLength(value, option?.widthRate);

  if (dight < length && option?.cut === true) {
    const {narrow: narrowRate, wide: wideRate} = option?.widthRate === undefined ? {narrow: 1, wide: 2} : option.widthRate;
    let fullSpaceCount: number = 0;
    let wideCharLength: number = 0;
    let narrowCount: number = 0;
    let cuttedString: string = "";
    for (const c of value) {
      if (isWideChar(c)) {
        wideCharLength += fullSpaceCount === 0 ? 1 : 0;
        fullSpaceCount = fullSpaceCount === 0 ? narrowRate - 1 : fullSpaceCount - 1;
        if (narrowCount + wideCharLength * wideRate >= dight - 2) {
          cuttedString = `${"　".repeat(fullSpaceCount)}${cuttedString}${".".repeat(dight - (narrowCount + wideCharLength * wideRate))}`;
          break;
        }
        cuttedString += c;
      } else {
        narrowCount += 1;
        cuttedString += c;
        if (narrowCount + wideCharLength * wideRate >= dight - 3) {
          cuttedString = `${"　".repeat(fullSpaceCount)}${cuttedString}${".".repeat(dight - (narrowCount + wideCharLength * wideRate))}`;
          break;
        }
      }
    }
    return cuttedString;
  } else {
    const padding: string = option?.zeroPadding === true ? "0" : " ";
    const formattedValue = `${padding.repeat(dight > length ? dight - length : 0)}${"　".repeat(fullSpaceRemain)}${value}`;
    return formattedValue;
  }
}