import { useState, useEffect } from 'react';
import Sidebar from '../sidebar';
import Navbar from '../layout/Navbar';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Check if we're on mobile
    useEffect(() => {
        const checkIfMobile = () => {
            setIsMobile(window.innerWidth < 1024); // 1024px is the lg breakpoint
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const toggleSidebar = () => {
        // Only toggle if we're on mobile
        if (isMobile) {
            setIsSidebarOpen(!isSidebarOpen);
        }
    };

    return (
        <div className="flex h-[100vh] w-[100%] overflow-hidden bg-white font-sans text-[#1A1A1A]">
            {/* Sidebar - fixed on both desktop and mobile */}
            <div
                className={`fixed top-0 left-0 h-screen z-[20]
                    ${isMobile ? 'w-[50%]' : 'w-[14%]'}
                    ${isMobile && !isSidebarOpen ? '-translate-x-full' : 'translate-x-0'}
                    transition-all duration-300 ease-in-out`}
            >
                <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar} />
            </div>

            {/* Main Content Area with dynamic margin based on sidebar state */}
            <div
                className={`flex flex-col flex-1 min-h-screen
                    ${isMobile ? (isSidebarOpen ? 'ml-[40%]' : 'ml-0') : 'ml-52'}
                    w-[${isMobile ? (isSidebarOpen ? '50%' : '100%') : '85%'}]
                    transition-all duration-300 ease-in-out`}
            >
                {/* Fixed Header */}
                <div className="fixed top-0 right-0 z-[30] w-full">
                    <Navbar />
                </div>

                {/* Main Content with padding for fixed header */}
                <div className="flex-1 mt-[48px] relative">
                    <main className="absolute inset-0 overflow-y-auto px-4 md:px-6">
                        {children}
                    </main>
                </div>
            </div>

            {/* Mobile Overlay */}
            {isMobile && isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[15] lg:hidden"
                    onClick={toggleSidebar}
                />
            )}
        </div>
    );
};

export default Layout; 