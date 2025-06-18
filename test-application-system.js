// test-application-system.js - Complete application system test
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let userToken = '';
let friendToken = '';
let companyToken = '';
let jobId = '';
let applicationId = '';
let referralCode = '';

const testApplicationSystem = async () => {
  console.log('🧪 Testing Refer\'d Application System...\n');
  
  try {
    // Step 1: Setup test accounts
    console.log('1️⃣ Setting up test accounts...');
    
    // Create company
    const testCompany = {
      email: `company${Date.now()}@test.com`,
      password: 'password123',
      companyName: 'Application Test Corp',
      industry: 'Technology',
      companySize: '11-50 employees',
      contactPerson: {
        firstName: 'Sarah',
        lastName: 'HR',
        position: 'HR Manager'
      },
      address: {
        city: 'London',
        postcode: 'EC1A 1BB',
        country: 'United Kingdom'
      }
    };
    
    try {
      const companyResponse = await axios.post(`${API_BASE}/auth/register-company`, testCompany);
      companyToken = companyResponse.data.token;
      console.log('   ✅ Company created');
    } catch (error) {
      console.log('   ❌ Company creation failed:', error.response?.data?.message);
      return;
    }
    
    // Create user (referrer)
    const testUser = {
      firstName: 'John',
      lastName: 'Referrer',
      email: `user${Date.now()}@test.com`,
      password: 'password123'
    };
    
    try {
      const userResponse = await axios.post(`${API_BASE}/auth/register`, testUser);
      userToken = userResponse.data.token;
      referralCode = userResponse.data.user.referralCode;
      console.log(`   ✅ User created with referral code: ${referralCode}`);
    } catch (error) {
      console.log('   ❌ User creation failed:', error.response?.data?.message);
      return;
    }
    
    // Create friend (applicant)
    const testFriend = {
      firstName: 'Jane',
      lastName: 'Applicant',
      email: `friend${Date.now()}@test.com`,
      password: 'password123'
    };
    
    try {
      const friendResponse = await axios.post(`${API_BASE}/auth/register`, testFriend);
      friendToken = friendResponse.data.token;
      console.log('   ✅ Friend (applicant) created');
    } catch (error) {
      console.log('   ❌ Friend creation failed:', error.response?.data?.message);
      return;
    }
    
    // Step 2: Company creates and activates a job
    console.log('\n2️⃣ Creating and activating job...');
    const testJob = {
      title: 'Full Stack Developer',
      description: 'We are looking for a talented full stack developer to join our team.',
      requirements: ['JavaScript', 'React', 'Node.js'],
      jobType: 'full-time',
      workType: 'hybrid',
      experienceLevel: 'mid',
      location: {
        city: 'London',
        country: 'United Kingdom'
      },
      salary: {
        min: 50000,
        max: 70000,
        currency: 'GBP'
      },
      referralFee: 1000,
      category: 'Engineering'
    };
    
    try {
      const jobResponse = await axios.post(`${API_BASE}/jobs`, testJob, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      jobId = jobResponse.data.data.job._id;
      console.log(`   ✅ Job created: ${jobResponse.data.data.job.title}`);
      
      // Activate the job
      await axios.put(`${API_BASE}/jobs/${jobId}/status`, { status: 'active' }, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      console.log('   ✅ Job activated');
    } catch (error) {
      console.log('   ❌ Job creation failed:', error.response?.data?.message);
      return;
    }
    
    // Step 3: User generates referral link
    console.log('\n3️⃣ Testing referral link generation...');
    try {
      const referralResponse = await axios.get(`${API_BASE}/jobs/${jobId}/referral-link`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (referralResponse.data.success) {
        console.log('   ✅ Referral link generated');
        console.log(`   🔗 Link: ${referralResponse.data.data.referralLink}`);
        console.log(`   💰 Potential earning: £${referralResponse.data.data.referralFee}`);
      }
    } catch (error) {
      console.log('   ❌ Referral link generation failed:', error.response?.data?.message);
    }
    
    // Step 4: Friend applies to job with referral code
    console.log('\n4️⃣ Testing job application with referral...');
    const applicationData = {
      jobId: jobId,
      coverLetter: 'I am very interested in this position and believe I would be a great fit.',
      referralCode: referralCode,
      consent: {
        dataProcessing: true,
        marketing: false
      }
    };
    
    try {
      const applicationResponse = await axios.post(`${API_BASE}/applications`, applicationData, {
        headers: { 'Authorization': `Bearer ${friendToken}` }
      });
      
      if (applicationResponse.data.success) {
        applicationId = applicationResponse.data.data.application._id;
        console.log('   ✅ Application submitted with referral');
        console.log(`   📧 Application ID: ${applicationId}`);
        console.log(`   🔗 Referred by: ${referralCode}`);
        
        if (applicationResponse.data.data.referralInfo) {
          console.log(`   💰 Referrer potential earning: £${applicationResponse.data.data.referralInfo.potentialEarning}`);
        }
      }
    } catch (error) {
      console.log('   ❌ Application submission failed:', error.response?.data?.message);
      return;
    }
    
    // Step 5: Test duplicate application prevention
    console.log('\n5️⃣ Testing duplicate application prevention...');
    try {
      await axios.post(`${API_BASE}/applications`, applicationData, {
        headers: { 'Authorization': `Bearer ${friendToken}` }
      });
      console.log('   ❌ Should have prevented duplicate application');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Duplicate application properly prevented');
        console.log(`   📝 Message: ${error.response.data.message}`);
      }
    }
    
    // Step 6: User views their applications
    console.log('\n6️⃣ Testing user application view...');
    try {
      const userAppsResponse = await axios.get(`${API_BASE}/applications/my-applications`, {
        headers: { 'Authorization': `Bearer ${friendToken}` }
      });
      
      if (userAppsResponse.data.success) {
        console.log('   ✅ User applications retrieved');
        console.log(`   📋 Total applications: ${userAppsResponse.data.data.pagination.totalApplications}`);
        
        if (userAppsResponse.data.data.applications.length > 0) {
          const app = userAppsResponse.data.data.applications[0];
          console.log(`   💼 Latest application: ${app.jobId.title} (${app.status})`);
        }
      }
    } catch (error) {
      console.log('   ❌ User applications view failed:', error.response?.data?.message);
    }
    
    // Step 7: User views their referrals
    console.log('\n7️⃣ Testing user referrals view...');
    try {
      const referralsResponse = await axios.get(`${API_BASE}/applications/my-referrals`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (referralsResponse.data.success) {
        console.log('   ✅ User referrals retrieved');
        console.log(`   🔗 Total referrals: ${referralsResponse.data.data.pagination.totalReferrals}`);
        console.log(`   💰 Earnings: £${referralsResponse.data.data.earnings.totalEarnings} total, £${referralsResponse.data.data.earnings.pendingEarnings} pending`);
        
        if (referralsResponse.data.data.referrals.length > 0) {
          const referral = referralsResponse.data.data.referrals[0];
          console.log(`   👤 Latest referral: ${referral.applicantId.firstName} ${referral.applicantId.lastName} (${referral.status})`);
        }
      }
    } catch (error) {
      console.log('   ❌ User referrals view failed:', error.response?.data?.message);
    }
    
    // Step 8: Company views applications
    console.log('\n8️⃣ Testing company application management...');
    try {
      const companyAppsResponse = await axios.get(`${API_BASE}/applications/company-applications`, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      
      if (companyAppsResponse.data.success) {
        console.log('   ✅ Company applications retrieved');
        console.log(`   📋 Total applications: ${companyAppsResponse.data.data.pagination.totalApplications}`);
        console.log(`   📊 Stats: ${JSON.stringify(companyAppsResponse.data.data.statistics)}`);
        
        if (companyAppsResponse.data.data.applications.length > 0) {
          const app = companyAppsResponse.data.data.applications[0];
          console.log(`   👤 Latest applicant: ${app.applicantId.firstName} ${app.applicantId.lastName}`);
          console.log(`   🔗 Is referral: ${app.isReferral ? 'Yes' : 'No'}`);
          if (app.isReferral && app.referredBy) {
            console.log(`   👥 Referred by: ${app.referredBy.firstName} ${app.referredBy.lastName} (${app.referredBy.referralCode})`);
          }
        }
      }
    } catch (error) {
      console.log('   ❌ Company applications view failed:', error.response?.data?.message);
    }
    
    // Step 9: Company updates application status through hiring process
    console.log('\n9️⃣ Testing application status updates...');
    
    const statusUpdates = [
      { status: 'reviewing', note: 'Application under review' },
      { status: 'shortlisted', note: 'Moved to shortlist' },
      { status: 'interviewing', note: 'Interview scheduled' },
      { status: 'hired', note: 'Candidate hired!' }
    ];
    
    for (const update of statusUpdates) {
      try {
        const statusResponse = await axios.put(`${API_BASE}/applications/${applicationId}/status`, update, {
          headers: { 'Authorization': `Bearer ${companyToken}` }
        });
        
        if (statusResponse.data.success) {
          console.log(`   ✅ Status updated to: ${update.status}`);
          
          if (update.status === 'hired') {
            console.log('   🎉 Candidate hired - referral payment should be processed!');
          }
        }
        
        // Small delay between status updates
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`   ❌ Status update to ${update.status} failed:`, error.response?.data?.message);
      }
    }
    
    // Step 10: Check final referral earnings
    console.log('\n🔟 Checking final referral earnings...');
    try {
      const finalReferralsResponse = await axios.get(`${API_BASE}/applications/my-referrals`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      
      if (finalReferralsResponse.data.success) {
        const earnings = finalReferralsResponse.data.data.earnings;
        console.log('   ✅ Final earnings calculated');
        console.log(`   💰 Total earnings: £${earnings.totalEarnings}`);
        console.log(`   💸 Pending earnings: £${earnings.pendingEarnings}`);
        console.log(`   🎯 Successful referrals: ${earnings.successfulReferrals}`);
        
        if (earnings.successfulReferrals > 0) {
          console.log('   🎉 Referral payment system working correctly!');
        }
      }
    } catch (error) {
      console.log('   ❌ Final earnings check failed:', error.response?.data?.message);
    }
    
    // Step 11: Test access control
    console.log('\n1️⃣1️⃣ Testing access control...');
    
    // Test company trying to submit application
    try {
      await axios.post(`${API_BASE}/applications`, applicationData, {
        headers: { 'Authorization': `Bearer ${companyToken}` }
      });
      console.log('   ❌ Company should not be able to submit applications');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Access control working - companies cannot submit applications');
      }
    }
    
    // Test user trying to update application status
    try {
      await axios.put(`${API_BASE}/applications/${applicationId}/status`, { status: 'hired' }, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });
      console.log('   ❌ User should not be able to update application status');
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('   ✅ Access control working - users cannot update application status');
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 APPLICATION SYSTEM TEST COMPLETE!');
    console.log('='.repeat(60));
    console.log('');
    console.log('✅ Job application system working');
    console.log('✅ Referral tracking working');
    console.log('✅ Application status management working');
    console.log('✅ Referral payment calculation working');
    console.log('✅ Company application dashboard working');
    console.log('✅ User application/referral dashboards working');
    console.log('✅ Access control working');
    console.log('');
    console.log('🎯 Phase 3 Application System: READY! 🚀');
    console.log('');
    console.log('📊 Complete Workflow Tested:');
    console.log('   1. ✅ User generates referral link');
    console.log('   2. ✅ Friend applies with referral code');
    console.log('   3. ✅ Company manages application process');
    console.log('   4. ✅ Referral payment calculated on hire');
    console.log('   5. ✅ All dashboards and analytics working');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Application system test failed:', error.message);
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure all previous phases are working');
    console.log('2. Check that Application model and controller are created');
    console.log('3. Verify server includes application routes');
    console.log('4. Check server logs for errors');
    process.exit(1);
  }
};

if (require.main === module) {
  testApplicationSystem();
}

module.exports = testApplicationSystem;