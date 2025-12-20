const wideWidthChar = (value: string) : boolean => {
  const utfPoint: number = value.charCodeAt(0);
  return 12288 <= utfPoint && utfPoint <= 40959;
}

const equalWidthLength = (value: string): {value: string, length: number} => {
  let wideCount: number = 0;
  let count: number = 0;
  for (const c of value) {
    if (wideWidthChar(c)) {
      if (wideCount === 0) {
        wideCount = 3;
        count += 5;
      }
      wideCount -= 1;
    } else {
      count += 1;
    }
  }
  return {
    value: `${"　".repeat(wideCount)}${value}`,
    length: count
  };
}

export const equalWidthFormat = (value: string, dight: number, zeroPadding?: boolean, cut?: boolean): string => {
  const padding: string = zeroPadding === true ? "0" : " ";
  const {value: wideFormattedValue, length} = equalWidthLength(value);
  const formattedValue = `${padding.repeat(dight > length ? dight - length : 0)}${wideFormattedValue}`;

  if (dight < length && cut === true) {
    let cuttedString: string = "";
    let wideCount: number = 0;
    let count: number = 0;
    for (const c of value) {
      cuttedString += c;
      if (wideWidthChar(c)) {
        if (wideCount === 0) {
          wideCount = 3;
          count += 5;
        }
        wideCount -= 1;
      } else {
        count += 1;
      }
      if (count >= dight - 3) {
        cuttedString = `${" ".repeat(wideCount)}${cuttedString}${".".repeat(dight - count)}`
      }
    }
    return cuttedString;
  } else {
    return formattedValue;
  }
}