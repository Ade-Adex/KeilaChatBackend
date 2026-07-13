// /src/types/declarations.d.ts

declare module 'useragent' {
  export interface Agent {
    toAgent(): string;
    toString(): string;
    os: {
      toString(): string;
      family: string;
      major: string;
      minor: string;
    };
    device: {
      toString(): string;
      family: string;
    };
    family: string;
    major: string;
    minor: string;
  }

  export function parse(userAgentString: string): Agent;
  export function lookup(userAgentString: string): Agent;
  export function is(userAgentString: string): {
    chrome: boolean;
    firefox: boolean;
    safari: boolean;
    opera: boolean;
    ie: boolean;
  };
}