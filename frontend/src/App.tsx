import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Home from './pages/Home';
import CreateGroup from './pages/CreateGroup';
import GroupDetail from './pages/GroupDetail';
import AddExpense from './pages/AddExpense';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateGroup />} />
          <Route path="/group/:groupId" element={<GroupDetail />} />
          <Route path="/group/:groupId/add-expense" element={<AddExpense />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
