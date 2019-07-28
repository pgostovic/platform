import React from 'react';
import { BrowserRouter as Router, Route } from 'react-router-dom';
import About from './About';
import Home from './Home';
import Style from './Style';

const App = () => (
  <Style>
    <Router>
      <Route path='/' exact component={Home} />
      <Route path='/about' exact component={About} />
    </Router>
  </Style>
);

export default App;
