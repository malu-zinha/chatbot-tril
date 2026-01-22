import React from 'react'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

const colorClasses = {
  primary: 'from-tecpred-primary to-tecpred-secondary',
  success: 'from-success to-green-600',
  warning: 'from-warning to-orange-600',
  danger: 'from-danger to-red-600',
  info: 'from-info to-blue-600',
}

const iconBgClasses = {
  primary: 'bg-tecpred-accent',
  success: 'bg-green-100',
  warning: 'bg-orange-100',
  danger: 'bg-red-100',
  info: 'bg-blue-100',
}

const iconColorClasses = {
  primary: 'text-tecpred-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'primary',
  trend,
  trendValue,
}: KPICardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 animate-fade-in">
      <div className={`h-2 bg-gradient-to-r ${colorClasses[color]}`}></div>
      
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {title}
            </p>
            <h3 className="text-3xl font-bold text-gray-900 mb-2">
              {value}
            </h3>
            {subtitle && (
              <p className="text-sm text-gray-500">
                {subtitle}
              </p>
            )}
            
            {trend && trendValue && (
              <div className="mt-2 flex items-center space-x-1">
                <span className={`text-xs font-semibold ${
                  trend === 'up' ? 'text-success' :
                  trend === 'down' ? 'text-danger' :
                  'text-gray-500'
                }`}>
                  {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
                </span>
              </div>
            )}
          </div>
          
          <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
            <Icon className={`w-6 h-6 ${iconColorClasses[color]}`} />
          </div>
        </div>
      </div>
    </div>
  )
}

