"use client"
import { useSelector } from "react-redux"
import { selectCurrentUser, selectUserRole } from "../store/slices/authSlice"
import { motion } from "framer-motion"
import Navbar from "../components/layout/Navbar"
import { useState } from "react"
import { ChevronRight, BarChart3, Users, TrendingUp, FileText } from "lucide-react"

const Home = () => {
  const user = useSelector(selectCurrentUser)
  const userRole = useSelector(selectUserRole)
  const [hoveredCard, setHoveredCard] = useState(null)

  const quickActions = [
    { 
      icon: BarChart3, 
      title: "Generate Report", 
      description: "Create comprehensive ESG reports",
      color: "from-emerald-500 to-teal-600"
    },
    { 
      icon: Users, 
      title: "Counselor Connect", 
      description: "Get expert sustainability guidance",
      color: "from-blue-500 to-indigo-600"
    },
    { 
      icon: TrendingUp, 
      title: "View Analytics", 
      description: "Track your ESG performance",
      color: "from-purple-500 to-pink-600"
    },
    { 
      icon: FileText, 
      title: "Recent Reports", 
      description: "Access your latest submissions",
      color: "from-orange-500 to-red-600"
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      },
    },
  }

  return (
    <div className="h-screen bg-gray-900 relative overflow-hidden">
      {/* Background Image with Overlay - Nature themed */}
      <div className="absolute inset-0">
        <img
          src="/public/GPEVG.jpg"
          alt="Nature Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/85 via-gray-800/75 to-emerald-900/60"></div>
      </div>

      {/* Subtle animated particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-emerald-400/20 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Navbar */}
      <Navbar className="bg-white/10 backdrop-blur-xl border-b border-white/10 relative z-50 " />

      {/* Main Content */}
      <motion.div
        className="relative z-10 h-full flex flex-col justify-center px-6 lg:px-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="max-w-7xl mx-auto w-full">
          {/* Hero Section */}
          <motion.div className="text-center mb-16" variants={itemVariants}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                  {user?.user_name || "User"}
                </span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
                Your comprehensive ESG management platform
              </p>
            </motion.div>
          </motion.div>

          {/* Quick Actions Grid */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
            variants={itemVariants}
          >
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <motion.div
                  key={index}
                  className="group relative bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer"
                  whileHover={{ 
                    scale: 1.02, 
                    y: -5,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  onHoverStart={() => setHoveredCard(index)}
                  onHoverEnd={() => setHoveredCard(null)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`} />
                  
                  <div className="relative z-10">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{action.description}</p>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all duration-300 mt-3" />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>

          {/* Bottom CTA Section */}
          <motion.div 
            className="flex flex-col lg:flex-row items-center justify-between gap-8"
            variants={itemVariants}
          >
            {/* Left CTA */}
            <motion.div
              className="flex-1 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 backdrop-blur-xl rounded-2xl p-8 border border-emerald-500/20 hover:border-emerald-400/30 transition-all duration-300 group cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Start New Assessment</h3>
                  <p className="text-gray-300">Begin your ESG evaluation journey</p>
                </div>
                <ChevronRight className="w-8 h-8 text-emerald-400 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </motion.div>

            {/* Right CTA */}
            <motion.div
              className="flex-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 backdrop-blur-xl rounded-2xl p-8 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300 group cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">Schedule Consultation</h3>
                  <p className="text-gray-300">Connect with our ESG experts</p>
                </div>
                <ChevronRight className="w-8 h-8 text-blue-400 group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Floating Brand Element */}
      <motion.div
        className="absolute bottom-8 right-8 bg-white/10 backdrop-blur-xl rounded-full p-4 border border-white/20"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, rotate: 5 }}
      >
        <img
          src="/public/47.png"
          alt="Company Logo"
          className="h-8 w-auto filter brightness-0 invert"
        />
      </motion.div>
    </div>
  )
}

export default Home