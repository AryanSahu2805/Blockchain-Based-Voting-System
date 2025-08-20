import React from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Zap, 
  Lock, 
  Globe, 
  Code, 
  Sparkles,
  TrendingUp
} from 'lucide-react';

const About: React.FC = () => {
  const features = [
    {
      icon: Shield,
      title: 'Blockchain Security',
      description: 'Every vote is cryptographically secured and stored on the blockchain, ensuring immutability and transparency.',
      color: 'from-emerald-400 to-teal-500'
    },
    {
      icon: Users,
      title: 'Democratic Process',
      description: 'Participate in fair and transparent elections where every vote counts and results are verifiable by all.',
      color: 'from-blue-400 to-indigo-500'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Real-time vote counting with instant result publication once the election period ends.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: Lock,
      title: 'Anonymous Voting',
      description: 'Your vote is private and anonymous while still being verifiable on the blockchain.',
      color: 'from-orange-400 to-red-500'
    },
    {
      icon: Globe,
      title: 'Global Access',
      description: 'Access the platform from anywhere in the world with an internet connection and Web3 wallet.',
      color: 'from-cyan-400 to-blue-500'
    },
    {
      icon: Code,
      title: 'Open Source',
      description: 'Built with transparency in mind, our code is open source and auditable by the community.',
      color: 'from-violet-400 to-purple-500'
    }
  ];



  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <motion.section
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative py-24 px-4"
      >
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500/30 rounded-full blur-3xl"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-40 right-1/3 w-60 h-60 bg-purple-500/20 rounded-full blur-2xl"></div>
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <motion.div variants={itemVariants} className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              About Our Platform
            </div>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          >
            Revolutionizing
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              {' '}Democratic Voting
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-xl md:text-2xl text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed"
          >
            We're building the future of secure, transparent, and accessible voting through 
            blockchain technology. Our platform ensures that every voice is heard and every vote is protected.
          </motion.p>


        </div>
      </motion.section>

      {/* Mission Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-24 px-4 bg-slate-900/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Our Mission
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              To democratize access to secure voting technology and ensure that every individual 
              can participate in fair, transparent, and verifiable elections.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div variants={itemVariants}>
              <h3 className="text-2xl font-bold text-white mb-6">
                Building Trust Through Technology
              </h3>
              <div className="space-y-4 text-slate-300">
                <p>
                  In an era where digital trust is paramount, we've created a voting platform 
                  that leverages the immutability and transparency of blockchain technology to 
                  restore faith in democratic processes.
                </p>
                <p>
                  Our smart contracts ensure that votes cannot be altered, deleted, or manipulated, 
                  while providing complete transparency for verification and audit purposes.
                </p>
                <p>
                  By eliminating the need for trusted intermediaries, we're creating a truly 
                  decentralized voting system that puts power back in the hands of the people.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="relative">
              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl p-8 border border-cyan-500/30">
                <div className="text-center">
                  <Shield className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-white mb-2">Security First</h4>
                  <p className="text-slate-300">
                    Every aspect of our platform is designed with security and privacy in mind, 
                    ensuring that your vote remains confidential while being verifiable.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-24 px-4"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Why Choose Blockchain Voting?
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Our platform combines cutting-edge blockchain technology with intuitive design 
              to deliver the most secure and transparent voting experience possible.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.02 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" 
                     style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }} />
                
                <div className="relative bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 h-full hover:border-slate-600 transition-all duration-300">
                  <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center mb-6`}>
                    <feature.icon className="w-7 h-7 text-white" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-4">
                    {feature.title}
                  </h3>
                  
                  <p className="text-slate-300 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-24 px-4 bg-slate-900/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How It Works
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Our blockchain voting process is simple, secure, and transparent. 
              Here's how we ensure your vote counts.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Connect Wallet',
                description: 'Connect your MetaMask or compatible Web3 wallet to authenticate your identity securely.',
                icon: Shield
              },
              {
                step: '02',
                title: 'Browse Elections',
                description: 'Explore active elections, read candidate information, and understand the voting process.',
                icon: Users
              },
              {
                step: '03',
                title: 'Cast Your Vote',
                description: 'Make your selection and submit your vote. It\'s recorded on the blockchain instantly and immutably.',
                icon: Zap // Changed from Vote to Zap as Vote is not imported
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                variants={itemVariants}
                className="text-center relative"
              >
                {index < 2 && (
                  <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                )}
                
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">{step.step}</span>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  {step.title}
                </h3>
                
                <p className="text-slate-300 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>



      {/* Technology Stack Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-24 px-4 bg-slate-900/50"
      >
        <div className="max-w-6xl mx-auto">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Technology Stack
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Built with modern, secure, and scalable technologies to ensure 
              the highest level of performance and reliability.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'React + TypeScript', description: 'Modern frontend framework with type safety' },
              { name: 'Solidity', description: 'Smart contract development for Ethereum' },
              { name: 'Node.js + Express', description: 'Scalable backend API development' },
              { name: 'MongoDB', description: 'Flexible NoSQL database solution' },
              { name: 'Hardhat', description: 'Ethereum development environment' },
              { name: 'Tailwind CSS', description: 'Utility-first CSS framework' },
              { name: 'Framer Motion', description: 'Production-ready motion library' },
              { name: 'Web3.js', description: 'Ethereum JavaScript API' }
            ].map((tech, index) => (
              <motion.div
                key={tech.name}
                variants={itemVariants}
                className="bg-slate-800/30 border border-slate-700 rounded-xl p-6 text-center hover:border-slate-600 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Code className="w-6 h-6 text-cyan-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {tech.name}
                </h4>
                <p className="text-slate-400 text-sm">
                  {tech.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
        className="py-24 px-4"
      >
        <motion.div 
          variants={itemVariants}
          className="max-w-4xl mx-auto text-center bg-gradient-to-r from-slate-800/50 to-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-3xl p-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Get Started?
          </h2>
          
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Experience the future of democratic voting with blockchain technology. 
            Your voice matters, and blockchain ensures it's heard.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <a
              href="/elections"
              className="group px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-2xl hover:shadow-cyan-500/25 transition-all duration-300 transform hover:scale-105"
            >
              <span className="flex items-center justify-center gap-3">
                View Active Elections
                <TrendingUp className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
              </span>
            </a>
          </div>
        </motion.div>
      </motion.section>
    </div>
  );
};

export default About;
