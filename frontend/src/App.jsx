import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ActivityTimelineProvider } from './contexts/ActivityTimelineContext';
import { SettingsProvider } from './contexts/SettingsContext';
import AuthAppWrapper from './components/AuthAppWrapper';
import Home from './pages/Home';
import TenderList from './pages/TenderList';
import AddTender from './pages/AddTender';
import TenderTracking from './pages/TenderTracking';
import RawMaterialTender from './pages/RawMaterialTender';
import LocalProductTender from './pages/LocalProductTender';
import ForeignProductTender from './pages/ForeignProductTender';
import ManufacturedProductTender from './pages/ManufacturedProductTender';
import RawMaterials from './pages/RawMaterials';
import AddRawMaterial from './pages/AddRawMaterial';
import LocalProducts from './pages/LocalProducts';
import AddLocalProduct from './pages/AddLocalProduct';
import ForeignProducts from './pages/ForeignProducts';
import AddForeignProduct from './pages/AddForeignProduct';
import ManufacturedProductsList from './pages/ManufacturedProductsList';
import ManufacturedProducts from './pages/ManufacturedProducts';
import ManufacturedRawMaterials from './pages/ManufacturedRawMaterials';
import ManufacturedLocalProducts from './pages/ManufacturedLocalProducts';
import ManufacturedForeignProducts from './pages/ManufacturedForeignProducts';
import LocalSuppliers from './pages/LocalSuppliers';
import ForeignSuppliers from './pages/ForeignSuppliers';
import Clients from './pages/Clients';
import Companies from './pages/Companies';
import Employees from './pages/Employees';
import Trash from './pages/Trash';
import Settings from './pages/Settings';
import './assets/css/rtl.css';
import './assets/css/sidebar-toggle.css';

// Protected App Routes - Only shown when user is authenticated
const AppRoutes = () => {
  return (
    <SettingsProvider>
      <ActivityTimelineProvider>
        <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/tender" element={<Home />} />
          <Route path="/tenders/list" element={<TenderList />} />
          <Route path="/tenders/add" element={<AddTender />} />
          <Route path="/tenders/edit/:id" element={<AddTender />} />
          <Route path="/tenders/tracking" element={<TenderTracking />} />
          <Route path="/tenders/raw-materials/:tenderId" element={<RawMaterialTender />} />
          <Route path="/tenders/local-products/:tenderId" element={<LocalProductTender />} />
          <Route path="/tenders/foreign-products/:tenderId" element={<ForeignProductTender />} />
          <Route path="/tenders/manufactured-products/:tenderId" element={<ManufacturedProductTender />} />
          <Route path="/raw-materials" element={<RawMaterials />} />
          <Route path="/raw-materials/add" element={<AddRawMaterial />} />
          <Route path="/raw-materials/edit/:id" element={<AddRawMaterial />} />
          <Route path="/local-products" element={<LocalProducts />} />
          <Route path="/local-products/add" element={<AddLocalProduct />} />
          <Route path="/local-products/edit/:id" element={<AddLocalProduct />} />
          <Route path="/foreign-products" element={<ForeignProducts />} />
          <Route path="/foreign-products/add" element={<AddForeignProduct />} />
          <Route path="/foreign-products/edit/:id" element={<AddForeignProduct />} />
          <Route path="/manufactured-products" element={<ManufacturedProductsList />} />
          <Route path="/manufactured-products/add" element={<ManufacturedProducts />} />
          <Route path="/manufactured-products/edit/:id" element={<ManufacturedProducts />} />
          <Route path="/manufactured-products/raw-materials/:productId" element={<ManufacturedRawMaterials />} />
          <Route path="/manufactured-products/local-products/:productId" element={<ManufacturedLocalProducts />} />
          <Route path="/manufactured-products/foreign-products/:productId" element={<ManufacturedForeignProducts />} />
          <Route path="/suppliers/local" element={<LocalSuppliers />} />
          <Route path="/suppliers/foreign" element={<ForeignSuppliers />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/trash" element={<Trash />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
        </Router>
      </ActivityTimelineProvider>
    </SettingsProvider>
  );
};

// Main App Component - Shows login page first, then protected routes
function App() {
  return (
    <AuthAppWrapper>
      <AppRoutes />
    </AuthAppWrapper>
  );
}

export default App;
