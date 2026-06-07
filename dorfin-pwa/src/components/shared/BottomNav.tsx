import { NavLink, useNavigate } from 'react-router-dom'
import { Home, BarChart2, Plus, BookOpen, User } from 'lucide-react'
import { motion } from 'framer-motion'

const tabs = [
  { to: '/',          icon: Home,      label: 'Inicio'   },
  { to: '/mesociclo', icon: BarChart2, label: 'Ciclo'    },
  { to: '/rutinas',   icon: BookOpen,  label: 'Rutinas'  },
  { to: '/perfil',    icon: User,      label: 'Perfil'   },
]

export function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dorfin-card border-t border-dorfin-border safe-area-pb">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {tabs.slice(0, 2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-dorfin-green' : 'text-dorfin-faint'}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-dorfin-green' : 'text-dorfin-faint'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/rutinas?nuevo=1')}
          className="nav-tab"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-green flex items-center justify-center shadow-glow -mt-5">
            <Plus size={22} className="text-dorfin-bg" strokeWidth={2.5} />
          </div>
        </motion.button>

        {tabs.slice(2).map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
          >
            {({ isActive }) => (
              <>
                <tab.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={isActive ? 'text-dorfin-green' : 'text-dorfin-faint'}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-dorfin-green' : 'text-dorfin-faint'}`}>
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}