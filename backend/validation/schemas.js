const Joi = require('joi');

// User validation schemas
const userSchemas = {
  // Profile update
  updateProfile: Joi.object({
    profileName: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Profile name must be at least 1 character long',
        'string.max': 'Profile name cannot exceed 100 characters'
      }),
    
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    
    profile: Joi.object({
      bio: Joi.string()
        .max(500)
        .optional()
        .messages({
          'string.max': 'Bio cannot exceed 500 characters'
        }),
      
      location: Joi.string()
        .max(100)
        .optional()
        .messages({
          'string.max': 'Location cannot exceed 100 characters'
        }),
      
      website: Joi.string()
        .uri()
        .optional()
        .messages({
          'string.uri': 'Please provide a valid website URL'
        }),
      
      avatar: Joi.string()
        .uri()
        .optional()
        .messages({
          'string.uri': 'Please provide a valid avatar URL'
        }),
      
      socialLinks: Joi.object({
        twitter: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Please provide a valid Twitter URL'
          }),
        
        linkedin: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Please provide a valid LinkedIn URL'
          }),
        
        github: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Please provide a valid GitHub URL'
          })
      }).optional(),
      
      interests: Joi.array()
        .items(Joi.string().max(50))
        .max(10)
        .optional()
        .messages({
          'array.max': 'You can have at most 10 interests',
          'string.max': 'Each interest cannot exceed 50 characters'
        })
    }).optional(),
    
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        browser: Joi.boolean().optional(),
        newElections: Joi.boolean().optional(),
        electionReminders: Joi.boolean().optional(),
        results: Joi.boolean().optional()
      }).optional(),
      
      privacy: Joi.object({
        showVotingHistory: Joi.boolean().optional(),
        showProfile: Joi.boolean().optional(),
        showActivity: Joi.boolean().optional()
      }).optional(),
      
      display: Joi.object({
        theme: Joi.string()
          .valid('light', 'dark', 'auto')
          .optional()
          .messages({
            'any.only': 'Theme must be light, dark, or auto'
          }),
        
        language: Joi.string()
          .length(2, 5)
          .optional()
          .messages({
            'string.length': 'Language code must be between 2 and 5 characters'
          })
      }).optional()
    }).optional()
  }),

  // Authentication
  authenticate: Joi.object({
    walletAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid Ethereum address format',
        'any.required': 'Wallet address is required'
      }),
    
    signature: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{130}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid signature format',
        'any.required': 'Signature is required'
      }),
    
    message: Joi.string()
      .required()
      .messages({
        'any.required': 'Message is required'
      }),
    
    nonce: Joi.string()
      .required()
      .messages({
        'any.required': 'Nonce is required'
      })
  })
};

// Election validation schemas
const electionSchemas = {
  // Create election
  createElection: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .required()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Title is required'
      }),
    
    description: Joi.string()
      .min(10)
      .max(2000)
      .required()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 2000 characters',
        'any.required': 'Description is required'
      }),
    
    candidates: Joi.array()
      .items(Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Candidate name must be at least 1 character long',
            'string.max': 'Candidate name cannot exceed 100 characters',
            'any.required': 'Candidate name is required'
          }),
        
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Candidate description cannot exceed 500 characters'
          }),
        
        imageUrl: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Please provide a valid image URL'
          })
      }))
      .min(2)
      .max(50)
      .required()
      .messages({
        'array.min': 'At least 2 candidates are required',
        'array.max': 'Maximum 50 candidates allowed',
        'any.required': 'Candidates are required'
      }),
    
    startDate: Joi.date()
      .greater('now')
      .required()
      .messages({
        'date.greater': 'Start date must be in the future',
        'any.required': 'Start date is required'
      }),
    
    endDate: Joi.date()
      .greater(Joi.ref('startDate'))
      .required()
      .messages({
        'date.greater': 'End date must be after start date',
        'any.required': 'End date is required'
      }),
    
    category: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Category must be at least 1 character long',
        'string.max': 'Category cannot exceed 50 characters'
      }),
    
    tags: Joi.array()
      .items(Joi.string().max(30))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag cannot exceed 30 characters'
      }),
    
    maxVoters: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.integer': 'Max voters must be a whole number',
        'number.min': 'Max voters must be at least 1'
      }),
    
    requiresRegistration: Joi.boolean()
      .optional(),
    
    votingMethod: Joi.string()
      .valid('single_choice', 'multiple_choice', 'ranked_choice')
      .optional()
      .messages({
        'any.only': 'Voting method must be single_choice, multiple_choice, or ranked_choice'
      }),
    
    imageUrl: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Please provide a valid image URL'
      })
  }),

  // Update election
  updateElection: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .optional()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 200 characters'
      }),
    
    description: Joi.string()
      .min(10)
      .max(2000)
      .optional()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 2000 characters'
      }),
    
    candidates: Joi.array()
      .items(Joi.object({
        id: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'number.integer': 'Candidate ID must be a whole number',
            'number.min': 'Candidate ID must be at least 1',
            'any.required': 'Candidate ID is required'
          }),
        
        name: Joi.string()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Candidate name must be at least 1 character long',
            'string.max': 'Candidate name cannot exceed 100 characters',
            'any.required': 'Candidate name is required'
          }),
        
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Candidate description cannot exceed 500 characters'
          }),
        
        imageUrl: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Please provide a valid image URL'
          })
      }))
      .min(2)
      .max(50)
      .optional()
      .messages({
        'array.min': 'At least 2 candidates are required',
        'array.max': 'Maximum 50 candidates allowed'
      }),
    
    startDate: Joi.date()
      .greater('now')
      .optional()
      .messages({
        'date.greater': 'Start date must be in the future'
      }),
    
    endDate: Joi.date()
      .greater(Joi.ref('startDate'))
      .optional()
      .messages({
        'date.greater': 'End date must be after start date'
      }),
    
    category: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Category must be at least 1 character long',
        'string.max': 'Category cannot exceed 50 characters'
      }),
    
    tags: Joi.array()
      .items(Joi.string().max(30))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag cannot exceed 30 characters'
      }),
    
    maxVoters: Joi.number()
      .integer()
      .min(1)
      .optional()
      .messages({
        'number.integer': 'Max voters must be a whole number',
        'number.min': 'Max voters must be at least 1'
      }),
    
    requiresRegistration: Joi.boolean()
      .optional(),
    
    votingMethod: Joi.string()
      .valid('single_choice', 'multiple_choice', 'ranked_choice')
      .optional()
      .messages({
        'any.only': 'Voting method must be single_choice, multiple_choice, or ranked_choice'
      }),
    
    imageUrl: Joi.string()
      .uri()
      .optional()
      .messages({
        'string.uri': 'Please provide a valid image URL'
      })
  })
};

// Blockchain validation schemas
const blockchainSchemas = {
  // Sync election
  syncElection: Joi.object({
    networkId: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Network ID must be a whole number',
        'number.min': 'Network ID must be at least 1',
        'any.required': 'Network ID is required'
      })
  }),

  // Verify transaction
  verifyTransaction: Joi.object({
    transactionHash: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{64}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid transaction hash format',
        'any.required': 'Transaction hash is required'
      }),
    
    networkId: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Network ID must be a whole number',
        'number.min': 'Network ID must be at least 1',
        'any.required': 'Network ID is required'
      })
  }),

  // Estimate gas
  estimateGas: Joi.object({
    electionAddress: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid election address format',
        'any.required': 'Election address is required'
      }),
    
    candidateId: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Candidate ID must be a whole number',
        'number.min': 'Candidate ID must be at least 1',
        'any.required': 'Candidate ID is required'
      }),
    
    networkId: Joi.number()
      .integer()
      .min(1)
      .required()
      .messages({
        'number.integer': 'Network ID must be a whole number',
        'number.min': 'Network ID must be at least 1',
        'any.required': 'Network ID is required'
      })
  })
};

// Admin validation schemas
const adminSchemas = {
  // Update user
  updateUser: Joi.object({
    isAdmin: Joi.boolean()
      .optional(),
    
    isVerified: Joi.boolean()
      .optional(),
    
    profileName: Joi.string()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.min': 'Profile name must be at least 1 character long',
        'string.max': 'Profile name cannot exceed 100 characters'
      }),
    
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      })
  }),

  // Update election
  updateElection: Joi.object({
    title: Joi.string()
      .min(3)
      .max(200)
      .optional()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 200 characters'
      }),
    
    description: Joi.string()
      .min(10)
      .max(2000)
      .optional()
      .messages({
        'string.min': 'Description must be at least 10 characters long',
        'string.max': 'Description cannot exceed 2000 characters'
      }),
    
    status: Joi.string()
      .valid('upcoming', 'active', 'ended', 'cancelled')
      .optional()
      .messages({
        'any.only': 'Status must be upcoming, active, ended, or cancelled'
      }),
    
    category: Joi.string()
      .min(1)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Category must be at least 1 character long',
        'string.max': 'Category cannot exceed 50 characters'
      }),
    
    tags: Joi.array()
      .items(Joi.string().max(30))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Maximum 10 tags allowed',
        'string.max': 'Each tag cannot exceed 30 characters'
      })
  })
};

// Query parameter validation schemas
const querySchemas = {
  // Pagination
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages({
        'number.integer': 'Page must be a whole number',
        'number.min': 'Page must be at least 1'
      }),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages({
        'number.integer': 'Limit must be a whole number',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      })
  }),

  // Search
  search: Joi.object({
    q: Joi.string()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.min': 'Search query must be at least 1 character long',
        'string.max': 'Search query cannot exceed 100 characters',
        'any.required': 'Search query is required'
      }),
    
    category: Joi.string()
      .max(50)
      .optional()
      .messages({
        'string.max': 'Category cannot exceed 50 characters'
      }),
    
    status: Joi.string()
      .valid('upcoming', 'active', 'ended', 'cancelled')
      .optional()
      .messages({
        'any.only': 'Status must be upcoming, active, ended, or cancelled'
      }),
    
    creator: Joi.string()
      .pattern(/^0x[a-fA-F0-9]{40}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid creator address format'
      })
  }),

  // Sorting
  sorting: Joi.object({
    sortBy: Joi.string()
      .valid('createdAt', 'title', 'startDate', 'endDate', 'totalVotes')
      .default('createdAt')
      .messages({
        'any.only': 'Sort by must be createdAt, title, startDate, endDate, or totalVotes'
      }),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc')
      .messages({
        'any.only': 'Sort order must be asc or desc'
      })
  })
};

module.exports = {
  userSchemas,
  electionSchemas,
  blockchainSchemas,
  adminSchemas,
  querySchemas
};
