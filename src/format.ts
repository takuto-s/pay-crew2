const isWideChar = (value: string) : boolean => {
  const utfPoint: number = value.charCodeAt(0);
  return 12288 <= utfPoint && utfPoint <= 40959;
}

const equalWidthLength = (value: string, widthRate?: {narrow: number, wide: number}): {value: string, length: number} => {
  const {narrow: narrowRate, wide: wideRate} = widthRate === undefined ? {narrow: 1, wide: 2} : widthRate;

  let wideCountDown: number = 0;
  let count: number = 0;
  for (const c of value) {
    if (isWideChar(c)) {
      if (wideCountDown === 0) {
        wideCountDown = narrowRate;
        count += wideRate;
      }
      wideCountDown -= 1;
    } else {
      count += 1;
    }
  }
  return {
    value: `${"　".repeat(wideCountDown)}${value}`,
    length: count
  };
}

export const equalWidthFormat = (value: string, dight: number, widthRate?: {narrow: number, wide: number}, zeroPadding?: boolean, cut?: boolean): string => {
  const {narrow: narrowRate, wide: wideRate} = widthRate === undefined ? {narrow: 1, wide: 2} : widthRate;
  const padding: string = zeroPadding === true ? "0" : " ";

  const {value: wideFormattedValue, length} = equalWidthLength(value, widthRate);
  const formattedValue = `${padding.repeat(dight > length ? dight - length : 0)}${wideFormattedValue}`;

  if (dight < length && cut === true) {
    let cuttedString: string = "";
    let wideCountDown: number = 0;
    let count: number = 0;
    for (const c of value) {
      if (isWideChar(c)) {
        if (wideCountDown === 0) {
          if (count >= dight - (3 + wideRate)) {
            cuttedString = `${" ".repeat(wideCountDown)}${cuttedString}${".".repeat(dight - count)}`;
            break;
          }
          wideCountDown = narrowRate;
          count += wideRate;
        }
        wideCountDown -= 1;
      } else {
        count += 1;
      }
      cuttedString += c;
      if (count >= dight - 3) {
        cuttedString = `${" ".repeat(wideCountDown)}${cuttedString}${".".repeat(dight - count)}`;
        break;
      }
    }
    return cuttedString;
  } else {
    return formattedValue;
  }
}