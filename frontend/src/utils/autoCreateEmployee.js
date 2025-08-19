import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../services/firebase';

/**
 * Automatically creates employee document for authenticated users who don't have one
 */
const autoCreateEmployeeForCurrentUser = () => {
  let hasRun = false;

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!user || hasRun) return;
    
    try {
      // Check if employee document already exists
      const employeeDoc = await getDoc(doc(db, 'employees', user.uid));
      
      if (!employeeDoc.exists()) {
        console.log('🔧 Auto-creating employee document for:', user.uid);
        
        const userData = {
          fullName: 'أحمد الهيدروليك',
          email: user.email,
          phone: '966501234567',
          jobTitle: 'مدير النظام',
          department: 'تقنية المعلومات',
          status: 'active',
          role: 'admin',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, 'employees', user.uid), userData);
        console.log('✅ Employee document auto-created successfully!');
        
        // Reload the page to trigger auth flow again
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        hasRun = true;
      }
    } catch (error) {
      console.error('❌ Auto-create employee failed:', error);
    }
  });

  // Clean up after 10 seconds
  setTimeout(() => {
    unsubscribe();
  }, 10000);
};

// Auto-run this when the module loads
if (typeof window !== 'undefined') {
  setTimeout(() => {
    autoCreateEmployeeForCurrentUser();
  }, 2000);
}

export default autoCreateEmployeeForCurrentUser;