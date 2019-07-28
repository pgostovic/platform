import React, { FC, ReactNode } from 'react';
import { createGlobalStyle } from 'styled-components';

const resetCss =
  // tslint:disable-next-line: no-var-requires
  process.env.NODE_ENV === 'test' ? '' : require('css-reset-and-normalize/css/reset-and-normalize.min.css');

const GlobalStyle = createGlobalStyle`
  ${resetCss}

  body {
    font-size: medium;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: sans-serif;
  }
`;

interface IProps {
  children: ReactNode;
}

const Style: FC<IProps> = ({ children }) => (
  <>
    <GlobalStyle key='global-style' />
    {children}
  </>
);

export default Style;
