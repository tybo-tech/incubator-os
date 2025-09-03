// Test script for assessment export functionality
// This demonstrates how to use the service with your exact data structure


// This is the exact data structure you provided
const yourSampleData = {
  id: 1991,
  type: "consolidated_assessment",
  company_id: 11,
  data: {
    metadata: {
      last_updated: "2025-09-03T03:21:30.275Z",
      current_section: "introduction",
      answered_questions: 25,
      progress_percentage: 100
    },
    responses: {
      "sc_how_win": "uniqueness - collaboration with other industry players. ",
      "sa_strengths": "time keeping; ensure quality control of clients-garments. excellent communication skills. ",
      "sc_where_play": "I want to play locally, be a local supplier within KCD. channels - schools; medical practitioners; corporates and farmers. including the hospitality industry. ",
      "sars_vat_status": "non_compliant",
      "sc_capabilities": "sewing and designing skills and manufacturing skills. management skills, marketing skills and strategies.",
      "ps_primary_focus": "products",
      "ps_target_market": "Individuals, schools, businesses using PPE, medical practitioners.",
      "sa_sales_ability": 6,
      "sars_paye_status": "non_compliant",
      "ps_offerings_list": "Uniforms for schools, PPE and Scrubs. Customized outfits and bags.",
      "ps_revenue_streams": "1",
      "sars_tax_clearance": true,
      "intro_business_stage": "startup",
      "sa_improvement_areas": "need help with patternmaking, assistance with financial management skills including costing. need more business skills and mentoring ie HR, ",
      "sa_leadership_skills": 7,
      "sa_marketing_ability": 6,
      "sars_compliance_notes": "New business venture.",
      "sc_management_systems": "SACAS - ISO systems - quality control systems: use whiteboard to tracks orders. need a sales and marketing system. accounting systems, HR and payroll systems. Health and Safety systems.",
      "sc_winning_aspiration": "I see myself supplying uniforms, PPE locally and sewing for individuals.",
      "sars_income_tax_status": "non_compliant",
      "intro_registration_date": "2024-02-07",
      "sars_outstanding_issues": false,
      "intro_business_motivation": "I want to make money, and this is my passion. Current state of the business. Currently sales of R 20 000. Cash in the bank R9000. There is no sales coming in at the moment....",
      "intro_business_description": "Sewing and tailoring for individual. Want to upgrade to do bulk sewing. Focusing on uniforms and PPE and scrubs.",
      "sa_accounting_understanding": 5
    },
    updated_at: "2025-09-03T03:21:30.275Z"
  },
  created_at: "2025-09-03 02:05:02",
  updated_at: "2025-09-03 03:21:30"
};

// Company data structure that matches your API
const sampleCompany = {
  id: 11,
  name: "Sample Sewing & Tailoring Company",
  registration_no: "2024/123456/07",
  service_offering: "Sewing, Tailoring, PPE Manufacturing",
  description: "Sewing and tailoring for individual. Want to upgrade to do bulk sewing. Focusing on uniforms and PPE and scrubs.",
  // ... other required ICompany fields
};

/*
Usage Examples:

1. Export with your exact data structure:
   assessmentExportService.exportAssessmentFromData(sampleCompany, yourSampleData)

2. The service will automatically:
   - Extract responses from yourSampleData.data.responses
   - Extract metadata from yourSampleData.data.metadata
   - Map question IDs to actual questions from the questionnaire
   - Generate professional PDF with sections and insights

3. For ratings (like sa_sales_ability: 6), it will show:
   - "6/10" with a "Good" insight badge

4. For compliance fields (like sars_vat_status: "non_compliant"), it will show:
   - "Non-Compliant" with warning styling

5. For yes/no fields (like sars_tax_clearance: true), it will show:
   - "Yes" with appropriate formatting

The PDF will be organized by sections:
- Introduction (intro_* questions)
- Strategy & Capabilities (sc_* questions)
- Self Assessment (sa_* questions)
- Products & Services (ps_* questions)
- SARS Compliance (sars_* questions)
*/
