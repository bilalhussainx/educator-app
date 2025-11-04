/**
 * =================================================================
 * LANDING PAGE - Educators Edge Platform
 * =================================================================
 * Premium 0.1% UI/UX Landing Page with Role-Based Authentication
 * Features: Animations, Diagrams, Interactive Elements
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Code,
  Sparkles,
  Trophy,
  Users,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  MessageSquare,
  Video,
  Brain,
  Target,
  TrendingUp,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: Code,
      title: 'LeetCode IDE',
      description: 'Practice coding with AI-powered assistance',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Video,
      title: 'Live Sessions',
      description: 'Connect with expert teachers in real-time',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: Brain,
      title: 'AI Writing Coach',
      description: 'Perfect your essays with intelligent feedback',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Trophy,
      title: 'Career Launchpad',
      description: 'Track progress and achieve your goals',
      color: 'from-orange-500 to-red-500',
    },
  ];

  const stats = [
    { label: 'Active Students', value: '10,000+', icon: Users },
    { label: 'Expert Teachers', value: '500+', icon: GraduationCap },
    { label: 'Success Rate', value: '95%', icon: TrendingUp },
    { label: 'AI Sessions', value: '50,000+', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 px-6 py-6 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Educators Edge
            </h1>
            <p className="text-xs text-gray-400">Where Learning Meets Innovation</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex gap-4"
        >
          <Button
            variant="ghost"
            className="text-white hover:text-cyan-400 transition-colors"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30"
            onClick={() => setShowAuthModal(true)}
          >
            Get Started
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-5xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full mb-8"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Powered by AI & Human Expertise</span>
          </motion.div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-cyan-200 to-white bg-clip-text text-transparent">
              Transform Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Learning Journey
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Experience the future of education with AI-powered coding practice,
            live mentorship, and intelligent writing assistance
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-6 text-lg shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all"
              onClick={() => setShowAuthModal(true)}
            >
              <Zap className="mr-2 w-5 h-5" />
              Start Learning Free
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-cyan-400/50 text-cyan-400 hover:bg-cyan-400/10 px-8 py-6 text-lg"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Explore Features
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-24"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <Card className="relative bg-white/5 backdrop-blur-lg border-white/10 p-6 text-center hover:bg-white/10 transition-all">
                <stat.icon className="w-8 h-8 mx-auto mb-3 text-cyan-400" />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Powerful Features
            </span>
          </h2>
          <p className="text-xl text-gray-400">Everything you need to succeed</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                onHoverStart={() => setActiveFeature(index)}
                className="relative group cursor-pointer"
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-20 rounded-2xl blur-xl transition-all duration-300`} />
                <Card className="relative bg-white/5 backdrop-blur-lg border-white/10 p-8 h-full hover:bg-white/10 transition-all hover:scale-105 hover:border-cyan-400/50">
                  <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Platform Benefits */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Built for Modern Learners
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Whether you're a student mastering computer science or a teacher inspiring the next generation,
              our platform adapts to your needs.
            </p>

            <div className="space-y-4">
              {[
                { icon: CheckCircle, text: 'AI-powered personalized learning paths' },
                { icon: Shield, text: 'Secure, trusted platform' },
                { icon: MessageSquare, text: 'Real-time collaboration tools' },
                { icon: Target, text: 'Goal tracking and achievements' },
              ].map((item, index) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-lg text-gray-200">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-3xl blur-3xl" />
            <Card className="relative bg-white/5 backdrop-blur-lg border-white/10 p-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full" />
                    <div>
                      <div className="font-semibold text-white">Sarah Johnson</div>
                      <div className="text-sm text-gray-400">Computer Science Student</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-300 italic">
                  "This platform completely transformed how I learn. The AI assistance on LeetCode problems
                  is incredible, and the live sessions with teachers helped me land my dream internship!"
                </p>
                <div className="pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm">Completed 200+ coding challenges</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-3xl" />
          <Card className="relative bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-lg border-white/20 p-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent">
                Ready to Start Your Journey?
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of students and teachers already transforming education
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-12 py-6 text-xl shadow-2xl shadow-cyan-500/30"
              onClick={() => setShowAuthModal(true)}
            >
              <Sparkles className="mr-2 w-6 h-6" />
              Get Started Now
            </Button>
          </Card>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-white">Educators Edge</div>
                <div className="text-sm text-gray-400">© 2025 All rights reserved</div>
              </div>
            </div>
            <div className="flex gap-8 text-gray-400">
              <a href="#" className="hover:text-cyan-400 transition-colors">About</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Features</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Pricing</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <RoleSelectionModal onClose={() => setShowAuthModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Role Selection Modal Component
const RoleSelectionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();

  const roles = [
    {
      type: 'student',
      icon: BookOpen,
      title: 'I\'m a Student',
      description: 'Learn, practice, and achieve your academic goals',
      features: ['Access LeetCode IDE', 'Book live sessions', 'AI writing assistance', 'Track progress'],
      color: 'from-cyan-500 to-blue-600',
    },
    {
      type: 'teacher',
      icon: GraduationCap,
      title: 'I\'m a Teacher',
      description: 'Inspire, guide, and transform student lives',
      features: ['Create courses', 'Host live sessions', 'Earn income', 'Build your brand'],
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Choose Your Path
          </h2>
          <p className="text-gray-400 text-lg">How do you want to use Educators Edge?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <motion.div
                key={role.type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group cursor-pointer"
                onClick={() => navigate('/register', { state: { role: role.type } })}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${role.color} opacity-20 rounded-2xl blur-xl group-hover:blur-2xl transition-all`} />
                <Card className="relative bg-slate-900/90 backdrop-blur-lg border-white/20 p-8 hover:bg-slate-900 transition-all hover:border-cyan-400/50">
                  <div className={`w-16 h-16 bg-gradient-to-r ${role.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">{role.title}</h3>
                  <p className="text-gray-400 mb-6">{role.description}</p>
                  <div className="space-y-3">
                    {role.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <Button className={`w-full mt-6 bg-gradient-to-r ${role.color} hover:opacity-90 text-white`}>
                    Continue as {role.type === 'student' ? 'Student' : 'Teacher'}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LandingPage;
