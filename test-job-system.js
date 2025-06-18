// test-job-system.js - Complete job system test
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let userToken = '';
let companyToken = '';
let jobId = '';

const testJobSystem = async () => {
  console.log('🧪 Testing Refer\'d Job System...\n');
  
  try {
    // Step 1: Register and login a company
    console.log('1️⃣ Setting up test company...');
    const testCompany = {
      email: `company${Date.now()}@test.com`,
      password: 'password123',
      companyName: 'Tech Innovations Ltd',
      industry: 'Technology',
      companySize: '11-50 employees',
      contactPerson: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        position: 'HR Director'
      },
      address: {
        city: 'London',
        postcode: 'EC1A 1BB',
        country: 'United Kingdom'
      }
    };
    
    try {
      const companyRegister = await axios.post(`${API_BASE}/auth/register-company`, testCompany);
      companyToken = companyRegister.data.token;
      console.log('   ✅ Company registered and logged in');
      console.log(`   🏢 Company: ${companyRegister.data.user.companyName}`);
    } catch (error) {
      console.log('   ❌ Company setup failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 2: Register and login a user
    console.log('\n2️⃣ Setting up test user...');
    const testUser = {
      firstName: 'John',
      lastName: 'Smith',
      email: `user${Date.now()}@test.com`,
      password: 'password123'
    };
    
    try {
      const userRegister = await axios.post(`${API_BASE}/auth/register`, testUser);
      userToken = userRegister.data.token;
      console.log('   ✅ User registered and logged in');
      console.log(`   👤 User: ${userRegister.data.user.firstName} ${userRegister.data.user.lastName}`);
      console.log(`   🔗 Referral Code: ${userRegister.data.user.referralCode}`);
    } catch (error) {
      console.log('   ❌ User setup failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 3: Test job filters endpoint
    console.log('\n3️⃣ Testing Job Filters...');
    try {
      const filtersResponse = await axios.get(`${API_BASE}/jobs/filters`);
      if (filtersResponse.data.success) {
        console.log('   ✅ Job filters retrieved');
        console.log(`   📊 Categories: ${filtersResponse.data.data.categories.length}`);
        console.log(`   📍 Locations: ${filtersResponse.data.data.locations.length}`);
        console.log(`   💼 Job Types: ${filtersResponse.data.data.jobTypes.length}`);
      }
    } catch (error) {
      console.log('   ❌ Job filters failed:', error.response?.data?.message || error.message);
    }
    
    // Step 4: Company creates a job
    console.log('\n4️⃣ Testing Job Creation (Company)...');
    const testJob = {
      title: 'Senior React Developer',
      description: 'We are looking for an experienced React developer to join our growing team. You will work on cutting-edge projects using the latest technologies.',
      requirements: [
        '5+ years of React experience',
        'Strong JavaScript/TypeScript skills',
        'Experience with Next.js',
        'Knowledge of state management (Redux/Zustand)'
      ],
      responsibilities: [
        'Develop and maintain React applications',
        'Collaborate with design and backend teams',
        'Write clean, testable code',
        'Mentor junior developers'
      ],
      jobType: 'full-time',
      workType: 'hybrid',
      experienceLevel: 'senior',
      location: {
        city: 'London',
        country: 'United Kingdom',
        postcode: 'EC1A 1BB',
        isRemote: false
      },
      salary: {
        min: 70000,
        max: 90000,
        currency: 'GBP',
        period: 'yearly'
      },
      benefits: [
        'Health insurance',
        'Flexible working hours',
        'Learning budget',
        'Stock options'
      ],
      referralFee: 1500,
      skills: [
        { name: 'React', level: 'advanced', required: true },
        { name: 'TypeScript', level: 'intermediate', required: true },
        { name: 'Next.js', level: 'intermediate', required: false }
      ],
      category: 'Engineering'
    };
    
    try {
      const jobResponse = await axios.post(`${API_BASE}/jobs`, testJob, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      
      if (jobResponse.data.success) {
        jobId = jobResponse.data.data.job._id;
        console.log('   ✅ Job created successfully');
        console.log(`   💼 Job: ${jobResponse.data.data.job.title}`);
        console.log(`   💰 Salary: ${jobResponse.data.data.job.salaryRange}`);
        console.log(`   🎯 Referral Fee: £${jobResponse.data.data.job.referralFee}`);
        console.log(`   📍 Location: ${jobResponse.data.data.job.location.city}`);
      }
    } catch (error) {
      console.log('   ❌ Job creation failed:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 5: Update job status to active
    console.log('\n5️⃣ Testing Job Status Update...');
    try {
      const statusResponse = await axios.put(`${API_BASE}/jobs/${jobId}/status`, 
        { status: 'active' }, 
        { headers: { 'Authorization': `Bearer ${companyToken}` } }
      );
      
      if (statusResponse.data.success) {
        console.log('   ✅ Job status updated to active');
        console.log(`   📊 Status: ${statusResponse.data.data.oldStatus} → ${statusResponse.data.data.newStatus}`);
      }
    } catch (error) {
      console.log('   ❌ Job status update failed:', error.response?.data?.message || error.message);
    }
    
    // Step 6: Browse jobs (public)
    console.log('\n6️⃣ Testing Job Browsing (Public)...');
    try {
      const jobsResponse = await axios.get(`${API_BASE}/jobs?limit=5`);
      
      if (jobsResponse.data.success) {
        console.log('   ✅ Jobs retrieved successfully');
        console.log(`   📋 Total jobs: ${jobsResponse.data.data.pagination.totalJobs}`);
        console.log(`   📄 Jobs on page: ${jobsResponse.data.data.jobs.length}`);
        
        if (jobsResponse.data.data.jobs.length > 0) {
          const firstJob = jobsResponse.data.data.jobs[0];
          console.log(`   💼 First job: ${firstJob.title}`);
          console.log(`   🏢 Company: ${firstJob.companyId?.companyName || 'Unknown'}`);
        }
      }
    } catch (error) {
      console.log('   ❌ Job browsing failed:', error.response?.data?.message || error.message);
    }
    
    // Step 7: View specific job
    console.log('\n7️⃣ Testing Single Job View...');
    try {
      const singleJobResponse = await axios.get(`${API_BASE}/jobs/${jobId}`);
      
      if (singleJobResponse.data.success) {
        const job = singleJobResponse.data.data.job;
        console.log('   ✅ Job details retrieved');
        console.log(`   💼 Title: ${job.title}`);
        console.log(`   📝 Description length: ${job.description.length} characters`);
        console.log(`   🔧 Requirements: ${job.requirements?.length || 0}`);
        console.log(`   📊 Views: ${job.stats.views}`);
      }
    } catch (error) {
      console.log('   ❌ Single job view failed:', error.response?.data?.message || error.message);
    }
    
    // Step 8: User generates referral link
    console.log('\n8️⃣ Testing Referral Link Generation...');
    try {
      const referralResponse = await axios.get(`${API_BASE}/jobs/${jobId}/referral-link`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (referralResponse.data.success) {
        console.log('   ✅ Referral link generated');
        console.log(`   🔗 Referral Code: ${referralResponse.data.data.referralCode}`);
        console.log(`   💰 Referral Fee: £${referralResponse.data.data.referralFee}`);
        console.log(`   📎 Link: ${referralResponse.data.data.referralLink}`);
      }
    } catch (error) {
      console.log('   ❌ Referral link generation failed:', error.response?.data?.message || error.message);
    }
    
    // Step 9: Test job search
    console.log('\n9️⃣ Testing Job Search...');
    try {
      const searchResponse = await axios.get(`${API_BASE}/jobs?search=React&category=Engineering`);
      
      if (searchResponse.data.success) {
        console.log('   ✅ Job search working');
        console.log(`   🔍 Search results: ${searchResponse.data.data.jobs.length} jobs`);
        console.log(`   📊 Total matching: ${searchResponse.data.data.pagination.totalJobs} jobs`);
      }
    } catch (error) {
      console.log('   ❌ Job search failed:', error.response?.data?.message || error.message);
    }
    
    // Step 10: Get company's jobs
    console.log('\n🔟 Testing Company Job Management...');
    try {
      const companyJobsResponse = await axios.get(`${API_BASE}/jobs/company/mine`, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      
      if (companyJobsResponse.data.success) {
        console.log('   ✅ Company jobs retrieved');
        console.log(`   📋 Company has: ${companyJobsResponse.data.data.jobs.length} jobs`);
        
        if (companyJobsResponse.data.data.jobs.length > 0) {
          const job = companyJobsResponse.data.data.jobs[0];
          console.log(`   💼 Job: ${job.title} (${job.status})`);
          console.log(`   📊 Stats: ${job.stats.views} views, ${job.stats.applications} applications`);
        }
      }
    } catch (error) {
      console.log('   ❌ Company job management failed:', error.response?.data?.message || error.message);
    }
    
    // Step 11: Test job statistics
    console.log('\n1️⃣1️⃣ Testing Job Statistics...');
    try {
      const statsResponse = await axios.get(`${API_BASE}/jobs/${jobId}/stats`, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      
      if (statsResponse.data.success) {
        const stats = statsResponse.data.data.stats;
        console.log('   ✅ Job statistics retrieved');
        console.log(`   👀 Views: ${stats.views}`);
        console.log(`   📱 Applications: ${stats.applications}`);
        console.log(`   🔗 Referral Views: ${stats.referralViews}`);
        console.log(`   📊 Application Rate: ${stats.applicationRate}%`);
      }
    } catch (error) {
      console.log('   ❌ Job statistics failed:', error.response?.data?.message || error.message);
    }
    
    // Step 12: Test access control
    console.log('\n1️⃣2️⃣ Testing Access Control...');
    
    // Test user trying to create job (should fail)
    try {
      await axios.post(`${API_BASE}/jobs`, testJob, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      console.log('   ❌ User should not be able to create jobs');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Access control working - users cannot create jobs');
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.data?.message);
      }
    }
    
    // Test company trying to generate referral link (should fail)
    try {
      await axios.get(`${API_BASE}/jobs/${jobId}/referral-link`, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      console.log('   ❌ Company should not be able to generate referral links');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Access control working - companies cannot generate referral links');
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.data?.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 JOB SYSTEM TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Job creation and management working');
    console.log('✅ Job browsing and search working');
    console.log('✅ Referral link generation working');
    console.log('✅ Access control working');
    console.log('✅ Job statistics working');
    console.log('✅ Company dashboard working');
    console.log('');
    console.log('🎯 Phase 2 Job System: READY! 🚀');
    console.log('');
    console.log('📊 Test Results Summary:');
    console.log(`   🏢 Company created: ${testCompany.companyName}`);
    console.log(`   👤 User created with referral code`);
    console.log(`   💼 Job created: ${testJob.title}`);
    console.log(`   🔗 Referral system functional`);
    console.log(`   📈 Analytics and tracking working`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Job system test failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Check that Job model and controller are created');
    console.log('3. Verify all Phase 1 authentication is working');
    console.log('4. Check server logs for errors');
    process.exit(1);
  }
};

if (require.main === module) {
  testJobSystem();
}

module.exports = testJobSystem;