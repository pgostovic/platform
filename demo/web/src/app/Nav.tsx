import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const NavLinks = styled.ul`
  display: flex;
  flex-direction: row;
`;
const NavLink = styled.li`
  margin-right: 20px;

  a {
    color: #33f;
    text-decoration: none;
  }
`;

const Nav = () => (
  <nav>
    <NavLinks>
      <NavLink>
        <Link to='/'>Home</Link>
      </NavLink>
      <NavLink>
        <Link to='/about'>About</Link>
      </NavLink>
    </NavLinks>
  </nav>
);

export default Nav;
