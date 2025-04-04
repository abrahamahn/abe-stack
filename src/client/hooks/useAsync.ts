import isEqual from "lodash/isEqual";
import { useEffect, useRef, useState } from "react";

import { useRefCurrent } from "./useRefCurrent";
import { useRefPrevious } from "./useRefPrevious";

export function useAsync<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  args: Args,
) {
  const [state, setState] = useState<T | undefined>(undefined);

  const currentFn = useRefCurrent(fn);

  const changeCount = useRef(0);
  const prevArgs = useRefPrevious(args);
  const same = isEqual(prevArgs.current, args);
  if (!same) changeCount.current += 1;

  useEffect(() => {
    const currentCount = changeCount.current;
    void currentFn.current(...args).then((result) => {
      if (changeCount.current === currentCount) {
        setState(result);
      }
    });
    return;
  }, [args, currentFn]);

  return state;
}
