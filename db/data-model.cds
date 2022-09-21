using {
    cuid,
    managed
} from '@sap/cds/common';

using {sf as sf} from '../db/sf-model';
context benefit{
   entity approval {
    key  CLAIM_REFERENCE: String(150);
    	 EMPLOYEE_ID: String (50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    	 EMPLOYEE_NAME: String(100) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    	 CLAIM_TYPE: String(50);
    	 CLAIM_DATE: Date;
    	 AMOUNT:Decimal(10,2);
    	 CLAIM_STATUS:String(50);
    	 CATEGORY_CODE:String(50);
    	 CLAIM_OWNER_ID: String(50);
    	 CLAIM_CATEGORY:String(50);
    	 SUBMITTED_BY:String(50);
    	 ESTIMATEPAYMENTDATE: Date;
    	 RECEIPT_DATE :  Date;
    }
    entity approval_structure  {
    key  Claim_code: String(50);
    	 Description: String (100);
    key	 Sequence_of_check: Integer;
    	 Personnel_Area: String(100);
    	 Personal_Subarea: String(100);
    	 Pay_Grade:String(50);
    	 Sponsor_Institution:String(100);
    	 Employee_Department:String(100);
    	 Employee_Division:String(100);
    	 First_Level_Approver:String(100);
    	 Second_Level_Approver:String(100);
    	 Third_Level_Approver:String(100);
    	 Fourth_Level_Approver:String(100);
    	 Specialisation:String(100);
    	 //HR_checker: Composition of one Hr_Checker
      //                     on $self = HR_checker.Claim;
    	 //HR_maker:Composition of many Hr_Maker
      //                     on $self = HR_maker.Claim;
    }
    
    entity approval_structure_hr  {
    key  Claim_code: String(50);
    	 Description: String (100);
    key	 Sequence_of_check: Integer;
    	 Personnel_Area: String(100);
    	 Personal_Subarea: String(100);
    	 Pay_Grade:String(50);
    	 Sponsor_Institution:String(100);
    	 Employee_Department:String(100);
    	 Employee_Division:String(100);
    	 First_Level_Approver:String(100);
    	 Second_Level_Approver:String(100);
    	 Third_Level_Approver:String(100);
    	 Fourth_Level_Approver:String(100);
    	 Specialisation:String(100);
    	 HR_checker: Composition of one Hr_Checker
                           on $self = HR_checker.Claim;
    	 HR_maker:Composition of many Hr_Maker
                           on $self = HR_maker.Claim;
    }
    
    entity Hr_Maker {
    	key UserID: String(50);
    	key Claim: Association to approval_structure_hr;
    }
    
    entity Hr_Checker {
    	    UserID: String(50);
       key  Claim: Association to approval_structure_hr;
    }
    
    entity Benefit_Claim_Admin{
    	key Start_Date:Date;
    	key End_Date:Date;
    	key Company:String(50);
    	key Claim_Code:String(50);
    	key Claim_Category:String(50);
    	Claim_Type:String(50);
    	Dependent_Claim_Code: String(50);
    	Ref_Replication_Date_Type: String(50);
    	Entitlement_Type:String(50);
    	Clinic_Required:String(50);
    	Probation_Type:String(50);
    	Entitlement_Rounding:String(50);
    	Show_Entitlement:String(50);
    	Attachment_Allowed:String(50);
    	Allow_Apply_In_Web:String(50);
    	Period_Number:String(50);
    	Period_Units:String(50);
    	Allow_Approver:String(50);
    	Pay_Component:String(50);
    	Sl_Application:String(50);
    	Replication_Type:String(50);
    	Payment_Mode:String(50);
    }
    
    entity Benefit_Eligibility{
    	key Sequence:Integer;
    	key Effective_Date:Date;
    	key End_Date:Date;
    	key Claim_Code:String(30);
    	Description:String(150);
    	Personal_Area:String(80);
    	Personal_Sub_Area:String(80);
    	Employee_Class:String(40);
    	Pay_Grade:String(40);
    	Document_Type:String(30);
    	Specialisation:String(30);
    	Basic_Pay:String(30);
    	Entitlement:Decimal(10,2);
    	Category_Code:String(50);
    	Category_Desc:String(150);
    }
    
    entity Claim_Admin{
    	 key Claim_Code:String(50);
    	 	 Start_Date:Date;
    		 End_Date:Date;
    		 Admin:String(150);
    	   	 Description:String(150);
    }
    
    entity Claim_Category{
    	key Company:String(50);
    	key Category_Code:String(150);
    	Category_Desc:String(150);
    }
    entity Claim_Clinic{
    	key Company:String(50);
    	key Clinic_Code:String(150);
    	Clinic_Name:String(150);
    }
    
    entity Claim_Code{
    	key Company:String(50);
    	key Claim_code:String(150);
    	Description:String(150);
    }
    
    entity Claim_Department{
    	key Company:String(50);
    	key Department_Code:String(150);
    	Department_Desc:String(150);
    }
    
    entity Claim_Division{
    	key Company:String(50);
    	key Division_Code:String(150);
    	Division_Desc:String(150);
    }
    
    entity Claim_Pa{
    	key Company:String(50);
    	key Personal_Area:String(150);
    	Personal_Desc:String(150);
    }
    
    entity Claim_Paycomponent{
    	key Company:String(50);
    	key PayComponent_ID:String(150);
    	PayComponent_Desc:String(150);
    }
    
     entity Claim_Pay_Grade{
    	key Company:String(50);
    	key PayGrade_ID:String(150);
    	PayGrade_Desc:String(150);
    }
    
    entity Claim_PSA{
    	key Company:String(50);
    	key Personal_Sub_Area:String(150);
    	Personal_Sub_Desc:String(150);
    }
    
    entity Claim_Specialisation{
    	key Company:String(50);
    	key Special_Code:String(150);
    	Special_Desc:String(150);
    }
    
     entity Claim_Sponsor{
    	key Company:String(50);
    	key Sponsor_Code:String(150);
    	Sponsor_Desc:String(150);
    }
    
    entity Claim_Status{
    	key Employee_Id: String(150) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined;
    	key Claim_Reference:String(50);
    	Submit_Date:Date;
    	Response_Date:Date;
    	Status:String(50);
    	Owner:String(150);
    	Total_Level:String(10);
    	Current_Level:String(10);
    	Approver1:String(150);
    	Approver2:String(150);
    	Approver3:String(150);
    	Approver4:String(150);
    	REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER4:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_REJECTION:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	FIRST_LEVEL_APPROVED_ON:Date;
    	SECOND_LEVEL_APPROVED_ON:Date;
    	THIRD_LEVEL_APPROVED_ON:Date;
    	FOURTH_LEVEL_APPROVED_ON:Date;
    	Submitted_By:String(50);
    	Cancel_flag: String(50);
    	Delegation_Comments:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Delegation1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Delegation2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Delegation3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Delegation4:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Reroute1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Reroute2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Reroute3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Reroute4:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	Reroute_Comments:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	CANCEL_ITEM:Composition of many CLAIM_CANCEL_MASTER on $self=CANCEL_ITEM.parent;
    }
    
    entity Company_Claim_Category{
    	key Company:String(50);
    	key Claim_code:String(150);
    	key Category_Code:String(150);
    	Description:String(150);
    	Category_Desc:String(150);
    }
    
    entity Company_Master{
    	key Company:String(50);
    	Company_Desc:String(150);
    }
    
    entity Co_Payment{
    	key Claim_Code:String(150);
    	Description:String(150);
    	key Clinic:String(50);
    	Clinic_Desc:String(150);
    	key Med_Leave_Declar:String(50);
    	key AL_Exceeded:String(5);
    	AL_Wardday_Limit:String(5);
    	Claim_Amount:Decimal(10,2);
    	Consultation_Fee:Decimal(10,2);
    	Other_Cost:Decimal(10,2);
    	Hospitalization_Fees:Decimal(10,2);
    	WARD_CHARGES:Decimal(10,2);
    	CAP_AMOUNT_PERCLAIM:Decimal(10,2);
    	CAP_AMOUNT_TOTAL:Decimal(10,2);
    	CAP_AMOUNT_ANNUAL:Decimal(10,2);
    }
    
    entity Demo_Hana{
    	key ID:Integer;
    	NAME:String(10);
    }
    
    entity EMPLOYEE_MASTER{
    	STATUS:String(50);
    	key USERID:String(50);
    	USERNAME:String(50);
    	FIRST_NAME:String(50);
    	NICKNAME:String(50);
    	MIDDLE_NAME:String(50);
    	LAST_NAME:String(50);
    	SUFFIX:String(150);
    	TITLE:String(150);
    	GENDER:String(50);
    	EMAIL:String(150);
    	MANAGER:String(50);
    	HUMAN_RESOURCE:String(150);
    	DEPARTMENT:String(150);
    	JOB_CODE:String(150);
    	DIVISION:String(50);
    	LOCATION:String(150);
    	TIME_ZONE:String(50);
    	HIRE_DATE:Date;
    	EMPLOYEE_ID:String(50);
    	BUSINESS_PHONE:String(50);
    	BUSINESS_FAX:String(50);
		ADDRESS_LINE1:String(150);
		ADDRESS_LINE2:String(150);
		CITY:String(150);
		STATE:String(50);
		ZIP:String(50);
		COUNTRY:String(50);
		MATRIX_MANAGER:String(50);
		DEFAULT_LOCALE:String(50);
		PROXY:String(50);
		SEATING_CHART:String(50);
		REVIEW_FREQUENCY:String(50);
		LAST_REVIEW_DATE:String(50);
		COMPANY_EXIT_DATE:String(50);
		CUSTOMIZABLE_FIELD1:String(150);
		CUSTOMIZABLE_FIELD2:String(150);
		CUSTOMIZABLE_FIELD3:String(150);
		CUSTOMIZABLE_FIELD4:String(150);
		CUSTOMIZABLE_FIELD5:String(150);
		ADID:String(150);
		CUSTOMIZABLE_FIELD7:String(150);
		CUSTOMIZABLE_FIELD8:String(150);
		CUSTOMIZABLE_FIELD9:String(150);
		CUSTOMIZABLE_FIELD10:String(150);
		CUSTOMIZABLE_FIELD11:String(150);
		CUSTOMIZABLE_FIELD12:String(150);
		CUSTOMIZABLE_FIELD13:String(150);
		CUSTOMIZABLE_FIELD14:String(150);
		CUSTOMIZABLE_FIELD15:String(150);
		PERSON_GUID:String(50);
		PERSON_ID_EXTERNAL:String(50);
		ASSIGNMENT_ID:String(150);
    }
    
    entity Medical_Claim {
    	key EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    	key CLAIM_CODE:String(50);
    	key CLAIM_REFERENCE:String(100);
    	key CLAIM_DATE:Date;
    	CLAIM_CATEGORY:String(100);
    	RELATION_TYPE:String(50);
    	DEPENDENT_NAME:String(100);
    	MED_LEAVE_DECLARATION:String(50);
    	CLINIC:String(50);
    	RECEIPT_NUMBER:String(50);
    	RECEIPT_DATE:Date;
    	NO_OF_WARD_DAYS:Decimal(10,1);
    	WARD_CHARGES:Decimal(10,2);
    	HOSPITALIZATION_FEES:Decimal(10,2);
    	CONSULTATION_FEE:Decimal(10,2);
    	OTHER_COST:Decimal(10,2);
    	CLAIM_CONSULTATION_FEE: Decimal(10,2);
    	CLAIM_OTHER_COST: Decimal(10,2);
    	CASH_AMOUNT:Decimal(10,2);
    	MEDISAVE_AMOUNT:Decimal(10,2);
    	MEDISHIELD_AMOUNT:Decimal(10,2);
    	PRIVATE_INSURER_AMT:Decimal(10,2);
    	RECEIPT_AMOUNT:Decimal(10,2);
    	CLAIM_AMOUNT:Decimal(10,2);
    	CLAIM_AMOUNT_WW:Decimal(10,2); 
    	AMOUNT_PAID_VIA_PAYROLL:Decimal(10,2);
    	AMOUNT_PAID_TOMEDISAVE:Decimal(10,2);
    	AMOUNT_PAID_TOMDEISHIELD:Decimal(10,2);
    	AMOUNT_PAID_TO_PRIVATE_INSURER:Decimal(10,2);
    	CLAIM_STATUS:String(50);
    	FIRST_LEVEL_APPROVER:String(50);
    	SECOND_LEVEL_APPROVER:String(50);
    	THIRD_LEVEL_APPROVER:String(50);
    	FIRST_LEVEL_APPROVED_ON:Date;
    	SECOND_LEVEL_APPROVED_ON:Date;
    	THIRD_LEVEL_APPROVED_ON:Date;
    	CREATED_ON:Date;
    	SUBMITTED_ON:Date;
    	SUBMITTED_BY:String(50);
    	REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_REJECTION:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	CATEGORY_CODE:String(50);
    	BEHALF_FLAG:String(10);
    	EXPENSE_TYPE:String(50);
		DESCRIPTION	:String(50);
    }
    
    entity overtime_claim{
    	key EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    	key CLAIM_CODE:String(60);
    	key CLAIM_REFERENCE:String(50);
    	key CLAIM_DATE:Date;
    	CLAIM_CATEGORY:String(50);
    	START_TIME:Time;
    	END_TIME:Time;
    	WORK_STATUS:String(50);
    	PUBLIC_HOLIDAY:String(50);
    	DEDUCT_BREAK:String(50);
    	WORK_HOURS_ACTUAL:Decimal(10,2);
    	WORK_HOURS_PAID:Decimal(10,2);
    	CLAIM_AMOUNT:Decimal(10,2);
    	TIMESHEET_CLAIM_ITEM:String(50);
    	CLAIM_STATUS:String(50);
    	FIRST_LEVEL_APPROVER:String(50);
    	SECOND_LEVEL_APPROVER:String(50);
    	THIRD_LEVEL_APPROVER:String(50);
    	FIRST_LEVEL_APPROVED_ON:Date;
    	SECOND_LEVEL_APPROVED_ON:Date;
    	THIRD_LEVEL_APPROVED_ON:Date;
    	CREATED_ON:Date;
    	SUBMITTED_ON:Date;
    	SUBMITTED_BY:String(50);
    	REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_APPROVER3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	REMARKS_REJECTION:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	CATEGORY_CODE:String(50);
    	BEHALF_FLAG:String(10);
    }
    
    entity WRC_HR_LINEITEM_CLAIM{
    	key EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    	key CLAIM_REFERENCE:String(50);
    	key LINE_ITEM_REFERENCE_NUMBER:String(50);
    	key CLAIM_CODE:String(50);
    	key CLAIM_CATEGORY:String(50);
    	key CLAIM_DATE:Date;
    	AMOUNT:Decimal(10,2);
    	CLAIM_AMOUNT:Decimal(10,2);
    	UNIT:Integer;
    	CLAIM_UNIT:Integer;
    	ITEM_LINE_REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    	parent:Association to WRC_HR_MASTER_CLAIM;
    }
    
   entity WRC_HR_MASTER_CLAIM{
   	key EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
   	key CLAIM_REFERENCE:String(50);
   	key CLAIM_DATE:Date;
   	key CLAIM_CATEGORY:String(150);
   	CLAIM_AMOUNT_BEFORE_CAPPING:Decimal(10,2);
   	CLAIM_AMOUNT:Decimal(10,2);
   	CLAIM_UNIT:Integer;
   	CLAIM_STATUS:String(50);
   	FIRST_LEVEL_APPROVER:String(50);
   	SECOND_LEVEL_APPROVER:String(50);
   	THIRD_LEVEL_APPROVER:String(50);
   	FOURTH_LEVEL_APPROVER:String(50);
   	FIRST_LEVEL_APPROVED_ON:Date;
   	SECOND_LEVEL_APPROVED_ON:Date;
   	THIRD_LEVEL_APPROVED_ON:Date;
   	FOURTH_LEVEL_APPROVED_ON:Date;
   	CREATED_ON:Date;
   	SUBMITTED_ON:Date;
   	SUBMITTED_BY:String(50);
   	REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	REMARKS_APPROVER1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	REMARKS_APPROVER2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	REMARKS_APPROVER3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	REMARKS_APPROVER4:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	REMARKS_REJECTION:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	CATEGORY_CODE:String(50);
   	BEHALF_FLAG:String(10);
   	LINE_ITEM:Composition of many WRC_HR_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
   }
   
   entity WRC_LINEITEM_CLAIM{
   	key EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
   	key CLAIM_REFERENCE:String(50);
   	key LINE_ITEM_REFERENCE_NUMBER:String(50);
   	key CLAIM_CODE:String(50);
   	key CLAIM_CATEGORY:String(50);
   	key CLAIM_DATE:Date;
   	AMOUNT:Decimal(10,2);
   	CLAIM_AMOUNT:Decimal(10,2);
   	UNIT:Integer;
   	CLAIM_UNIT:Integer;
   	ITEM_LINE_REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   	parent:Association to WRC_MASTER_CLAIM;
   }
   
   entity WRC_MASTER_CLAIM{
   	key	EMPLOYEE_ID:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
   	key	CLAIM_REFERENCE:String(50);
   	key	CLAIM_DATE:Date;
   	key	CLAIM_CATEGORY:String(150);
   		CLAIM_AMOUNT_BEFORE_CAPPING:Decimal(10,2);
   		CLAIM_AMOUNT:Decimal(10,2);
   		CLAIM_UNIT:Integer;
   		CLAIM_STATUS:String(50);
   		FIRST_LEVEL_APPROVER:String(50);
   		SECOND_LEVEL_APPROVER:String(50);
   		THIRD_LEVEL_APPROVER:String(50);
   		FIRST_LEVEL_APPROVED_ON:Date;
   		SECOND_LEVEL_APPROVED_ON:Date;
   		THIRD_LEVEL_APPROVED_ON:Date;
   		CREATED_ON:Date;
   		SUBMITTED_ON:Date;
   		SUBMITTED_BY:String(50);
   		REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   		REMARKS_APPROVER1:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   		REMARKS_APPROVER2:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   		REMARKS_APPROVER3:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   		REMARKS_REJECTION:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
   		CATEGORY_CODE:String(50);
   		BEHALF_FLAG:String(10);
   		LINE_ITEM:Composition of many WRC_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
   };
   
   
   entity WRC_CLAIM_TYPE {
		key	WRC_CLAIM_TYPE_ID: String(50);
			CLAIM_CODE: String(150);
			START_DATE: Date;
			END_DATE: Date;
			PAY_GRADE: String(50);
			AMOUNT: Decimal(10,2);
			DAY_TYPE: String(50);
			DAY_TYPE_CODE: String(50);
   };
   
   entity WRC_CLAIM_VALIDATION_CONFIG {
		key	CLAIM_CODE: String(150);
		key	CLAIM_CATEGORY: String(20);
			ALLOW_WITH_OTHER_CODE_SAME_DAY: String(3);
			ALLOW_MULTIPLE_CODE_SAME_DAY: String(3);
   };
   
   entity CPR_CLAIM{
		key EMPLOYEE_ID	: String(50)	 @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key CLAIM_REFERENCE	: String(50);	
		key CLAIM_DATE	: Date;	
		key CLAIM_CODE	: String(50);	
			CLAIM_CATEGORY	: String(150);	
			CATEGORY_CODE	: String(50);	
			CLAIM_STATUS	: String(50);	
			CLAIM_AMOUNT	: Decimal(10,2);
			TEMPLATE	: String(50);
			CURRENCY    : String(10);	
			FIRST_LEVEL_APPROVER	: String(50);	
			SECOND_LEVEL_APPROVER	: String(50);	
			THIRD_LEVEL_APPROVER	: String(50);	
			FOUR_LEVEL_APPROVER	: String(50);	
			FIRST_LEVEL_APPROVED_ON	:Date;	
			SECOND_LEVEL_APPROVED_ON :Date;	
			THIRD_LEVEL_APPROVED_ON	:Date;	
			FOUR_LEVEL_APPROVED_ON	:Date;	
			CREATED_ON	:Date;	
			SUBMITTED_ON :Date;
			SUBMITTED_BY : String(50);
			ORIGINAL_CLAIM_REFERENCE: String(50);
			REMARKS_EMPLOYEE:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER1: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER2: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER3: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION	
			REMARKS_APPROVER4: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION	
			REMARKS_REJECTION: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION	
			BEHALF_FLAG: String(10);	
	
   };
   
   entity Location_RO{
   	key  DEPARTMENT:String(150);
   		 DEPARTMENT_ID: String(100);
    key  DIVISION:String(50);
    	 DIVISION_ID: String(100);
    key	 Location_RO_EmployeeID:String(50);
    	 START_DATE: Date;
    	 END_DATE: Date;
   };
//       	entity LocationEmployeeDetails as SELECT from EMPLOYEE_MASTER inner join Location_RO on EMPLOYEE_MASTER.EMPLOYEE_ID=Location_RO.Location_RO_EmployeeID {
// 					Location_RO.DIVISION as ClaimOwnerDiv ,
// 					Location_RO.DEPARTMENT as ClaimOwnerDept,
// 					Location_RO.Location_RO_EmployeeID,
// 					EMPLOYEE_MASTER.USERNAME
// };
   	entity masterandLocation as
   	select from EMPLOYEE_MASTER as appEmp
   	inner join Location_RO as ro 
   	on appEmp.USERID=ro.Location_RO_EmployeeID 
   	inner join EMPLOYEE_MASTER as loginEmp on loginEmp.DIVISION=ro.DIVISION and loginEmp.DEPARTMENT=ro.DEPARTMENT {
					loginEmp.DIVISION ,
					loginEmp.DEPARTMENT,
					ro.Location_RO_EmployeeID as ApproverID,
					loginEmp.EMAIL,
					appEmp.USERNAME as ApproverName
};


// Transportation
	entity Benefit_Transport_Amount{
		key DIVISION_FROM		: String;
		key DIVISION_TO 		: String;
		key VEHICLE_CODE		: String;
			VEHICLE				: String;
			DISTANCE			: Decimal(5,2);
			RATE				: Decimal(5,2);
	}
entity Benefit_Entitlement_Adjust{
		key emp_Id                  : String(50);
		key Year					: String(4);
		key	Claim_code				: String(50);
			Adjustment				: Decimal(10,2);
}
// Transportation 
//   define view claimApproverView (input1:String) as
//   	select from EMPLOYEE_MASTER as appEmp
//   	 {
// 				appEmp.USERID
// }where USERID=:input1;

// New Tables for Employee as per CPI
//=====================TPT===================

	entity TC_MASTER_CLAIM {
		key EMPLOYEE_ID                  : String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key CLAIM_REFERENCE              : String(50);
		key CLAIM_DATE                   : Date;
    	key CLAIM_CATEGORY               : String(50);
    	    CLAIM_AMOUNT_BEFORE_CAPPING  : Decimal(10,2);
    	    CLAIM_AMOUNT	             : Decimal(10,2);
    	    CLAIM_STATUS                 : String(50);
    	    FIRST_LEVEL_APPROVER         : String(50);
            SECOND_LEVEL_APPROVER	     : String(50);
			THIRD_LEVEL_APPROVER         : String(50);
			FIRST_LEVEL_APPROVED_ON      : Date;
			SECOND_LEVEL_APPROVED_ON     : Date;
			THIRD_LEVEL_APPROVED_ON      : Date;
			CREATED_ON                   : Date; 
			SUBMITTED_ON                 : Date;
			SUBMITTED_BY			     : String(50);
			REMARKS_EMPLOYEE             : String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER1            : String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER2            : String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER3            : String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_REJECTION            : String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			CATEGORY_CODE                : String(50) ;
			BEHALF_FLAG                  : String(10);
			LINE_ITEM:Composition of many TC_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity TC_LINEITEM_CLAIM  {
		key CLAIM_REFERENCE      :  String(50);
		key	EMPLOYEE_ID          :  String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	LINE_ITEM_REFERENCE_NUMBER:  String(50);
		key	CLAIM_CODE           :  String(50);
		key	CLAIM_CATEGORY       :  String(50);
		key	CLAIM_DATE           :  Date;
			TRIP_PURPOSE         :  String(50);
			RECEIPT_DATE         :  Date;
			RECEIPT_NUMBER       :  String(50);
			TRANSPORT_FROM       :  String(50);
			OTHER_LOC_FROM       :  String(50);
			TRANSPORT_TO         :  String(50);
			OTHER_LOC_TO         :  String(50);
			TRANSPORT_TYPE       :  String(50);
			VEHICAL_NO           :  String(50);
			START_TIME           :  Time;
			END_TIME             :  Time;
			TOTAL_RECEIPT_AMOUNT :  Decimal(10,2);
			TOTAL_DISTANCE       :  Decimal(10,2);
			ERP_COST             :  Decimal(10,2);
			PARKING_COST         :  Decimal(10,2);
			COST_DISTANCE        :  Decimal(10,2);
			RECEIPT_AMOUNT       :  Decimal(10,2);
			CLAIM_AMOUNT         :  Decimal(10,2);
			REMARKS_EMPLOYEE     :  String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to TC_MASTER_CLAIM;
	} 
	
	entity	COV_MASTER_CLAIM{
			key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
			key	CLAIM_REFERENCE	:String(50);
			key	CLAIM_DATE :Date;
			key	CLAIM_CATEGORY	:String(50);
		    	CLAIM_AMOUNT	:Decimal(10,2);
				CLAIM_STATUS	:String(50);
				STAY_HOME_NOTICE	:Decimal(10,2);
				COUNTRY_HIRE	:String(150);
				FIRST_LEVEL_APPROVER	:String(50);
				SECOND_LEVEL_APPROVER	:String(50);
				THIRD_LEVEL_APPROVER	:String(50);
				FIRST_LEVEL_APPROVED_ON	:Date;
				SECOND_LEVEL_APPROVED_ON	:Date;
				THIRD_LEVEL_APPROVED_ON	:Date;
				CREATED_ON	:Date;
				SUBMITTED_ON	:Date;
				SUBMITTED_BY	:String(50);
				REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
				REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
				REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
				REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
				REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
				CATEGORY_CODE	:String(50);
				BEHALF_FLAG	:String(10);	
				LINE_ITEM:Composition of many COV_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity	COV_LINEITEM_CLAIM{
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			RECEIPT_AMOUNT	:Decimal(10,2);
			RECEIPT_DATE	:Date;
			RECEIPT_NUMBER	:String(50);
			EXPENSE_TYPE	:String(50);
			DESCRIPTION	:String(50);
			OTHERS	:String(150);
			CLAIM_AMOUNT	:Decimal(10,2);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to COV_MASTER_CLAIM;
	}
	
	entity	PC_CLAIM{
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	CLAIM_DATE	:Date;
		key	CLAIM_CODE	:String(50);
			CLAIM_CATEGORY	:String(50);
			RECEIPT_DATE	:Date;
			RECEIPT_NUMBER	:String(50);
			RECEIPT_AMOUNT	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			DESCRIPTION	:String(50);
			VENUE	:String(150);
			PURPOSE	:String(50);
			GUEST_COMPANY	:String(50);
			GUEST_NAME	:String(50);
			CLAIM_STATUS	:String(50);
			EXPENSE_TYPE	:String(50);
			NO_OF_GUEST : String(50);
			FIRST_LEVEL_APPROVER	:String(50);
			SECOND_LEVEL_APPROVER	:String(50);
			THIRD_LEVEL_APPROVER	:String(50);
			FIRST_LEVEL_APPROVED_ON	:Date;
			SECOND_LEVEL_APPROVED_ON	:Date;
			THIRD_LEVEL_APPROVED_ON	:Date;
			CREATED_ON	:Date;
			SUBMITTED_ON	:Date;
			SUBMITTED_BY	:String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			CATEGORY_CODE	:String(50);
			BEHALF_FLAG	:String(10);
	}
	
	entity PTF_ACL_BCL_CLAIM  {
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CODE	:String(50);
		CLAIM_CATEGORY	:String(50);
		RECEIPT_DATE	:Date;
		RECEIPT_NUMBER	:String(50);
		RECEIPT_AMOUNT	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		PTF_TYPE	:String(50);
		PTF_DESCRIPTION	:String(50);
		START_DATE	:Date;
		END_DATE	:Date;
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String;
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
	}
	
	entity SP_MASTER_CLAIM {	
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	:String(50);
		START_DATE	:Date;
		END_DATE	:Date;
		LENGTH_OF_STAY	:Decimal(10,2);
		PURPOSE_OF_TRIP	:String(150);
		TRIP_REMARKS	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CLAIM_AMOUNT_BEFORE_CAPPING	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many SP_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
		entity SP_LINEITEM_CLAIM {	
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			RECEIPT_AMOUNT	:Decimal(10,2);
			RECEIPT_DATE	:Date;
			EXPENSE_TYPE	:String(50);
			DESCRIPTION	:String(50);
			RECEIPT_NUMBER	:String(50);
			CURRENCY	:String(50);
			EXCHANGE_RATE	:Decimal(10,4);
			CONVERT_RECEIPT_AMOUNT	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			VENUE_DECSRIPTION	:String(150);
			SPS_REFERENCE	:String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to SP_MASTER_CLAIM;
	}
	
	entity AHP_LIC_MS_WIC_CLAIM{
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CODE	:String(50);
		CLAIM_CATEGORY	:String(50);
		RECEIPT_DATE	:Date;
		RECEIPT_NUMBER	:String(50);
		RECEIPT_AMOUNT	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		EXPENSE_TYPE	:String(50);
		DESCRIPTION	:String(50);
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
	}
	
	entity Medisave_Credit: managed, cuid  {
		key DEPENDENT_CLAIM_CODE: String(50);
		key EMPLOYEE_ID	   : String(50);
		key claimYear      : String(4);
		ref_num            : String(40);
		PAY_COMPONENT      : String(50);
		EFFECTIVE_DATE     : Date; 
	Ring_Fenced_Claim_Amount : Decimal(10,2);
	}
	
	entity CLAIM_CANCEL_MASTER {	
	key	EMPLOYEE_ID	:String(50);
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	:String(50);
		parent: Association to Claim_Status;
	}
	
	entity BEN_LOCATION{
		key START_DATE : Date;
		key END_DATE: Date;
		key	LOCATION: String(100);
	}
	
	entity VEHICLE_RATE{
		key START_DATE : Date;
		key END_DATE: Date;
		key TRANSPORT_TYPE: String(50);
		TRANSPORT_DESC:String(50);
		RATE:Decimal(10,2)
	}
	entity SUPER_ADMIN{
	key PERSONIDEXTERNAL : String(30);
	key	START_DATE : Date;
	key	END_DATE : Date;
		FIRSTNAME : String(100);
		LASTNAME : String(100);
		ADMIN_ROLE : String(10);
		BEN_INFO : String(10);
		BEN_COPAY : String(10);
		BEN_ELIGIBILITY : String(10);
		BEN_APPROVAL : String(10);
		BEN_HR_MAKER : String(10);
		BEN_HR_CHECKER : String(10);
		BEN_TABLE_MAINT : String(10);
		BEN_MASS_CREATE : String(10);
		BEN_MASS_CONFIG : String(10);
		BEN_ON_BEHALF : String(10);
		BEN_COORDIN : String(10);
		BEN_REPORT : String(10);
		BEN_MED_SAVE : String(10);
	}
	
	entity ADMIN_ROLE{
	key EMPLOYEE_ID:String(50);	
		FIRSTNAME  :String(150);	
		LASTNAME:String(150);	
	key	START_DATE: Date;
	key	END_DATE : Date	;
	key	ADMIN:String(10);	
		APPROVAL:String(10);	
		COPAY:String(10);	
		ELIGIBILITY:String(10);	
		ON_BEHALF:String(10);	
		TABLE_MAINT:String(10);	
		MEDISAVE:String(10)	;
		YTD_REPORT:String(10);	
		CLAIM_REPORT:String(10);
		INTERIM_REPORT:String(10);	
		RE_ROUTE:String(10)	;
		CLAIM_UPLOAD:String(10);	
		ADMIN_DELEGATE:String(10);	
		CLAIM_COORD:String(10);	
		ADMIN_ROLE:String(10);	
	}
	
	entity CLAIM_COORDINATOR {
		EMPLOYEE_ID:String(50);
		EMP_FNAME:String(50);
		EMP_LANME:String(50);
		STARTDATE:Date;
		ENDDATE:Date;
		PERSONNEL_AREA:String(50);
		PERSONAL_SUBAREA:String(50);
		PAY_GRADE:String(50);
		SPONSOR_INSTITUTION:String(50);
		SPECIALISATION:String(50);
		EMPLOYEE_DEPARTMENT:String(50);
		EMPLOYEE_DIVISION:String(50);
		COORDINATOR:String(50);
		COORD_FNAME:String(50);
		COORD_LNAME:String(50);
		REPORT:String(50);
		SUBMIT:String(50);
	}


    entity SP1_MASTER_CLAIM {	
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	:String(50);
		START_DATE	:Date;
		END_DATE	:Date;
		LENGTH_OF_STAY	:Decimal(10,2);
		PURPOSE_OF_TRIP	:String(150);
		TRIP_REMARKS	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CLAIM_AMOUNT_BEFORE_CAPPING	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many SP1_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
		entity SP1_LINEITEM_CLAIM {	
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			RECEIPT_AMOUNT	:Decimal(10,2);
			RECEIPT_DATE	:Date;
			EXPENSE_TYPE	:String(50);
			DESCRIPTION	:String(50);
			RECEIPT_NUMBER	:String(50);
			CURRENCY	:String(50);
			EXCHANGE_RATE	:Decimal(10,4);
			CONVERT_RECEIPT_AMOUNT	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			VENUE_DECSRIPTION	:String(150);
			SPS_REFERENCE	:String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to SP1_MASTER_CLAIM;
	}

    entity SP2_MASTER_CLAIM {	
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	:String(50);
		START_DATE	:Date;
		END_DATE	:Date;
		LENGTH_OF_STAY	:Decimal(10,2);
		PURPOSE_OF_TRIP	:String(150);
		TRIP_REMARKS	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CLAIM_AMOUNT_BEFORE_CAPPING	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many SP2_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
		entity SP2_LINEITEM_CLAIM {	
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			RECEIPT_AMOUNT	:Decimal(10,2);
			RECEIPT_DATE	:Date;
			EXPENSE_TYPE	:String(50);
			DESCRIPTION	:String(50);
			RECEIPT_NUMBER	:String(50);
			CURRENCY	:String(50);
			EXCHANGE_RATE	:Decimal(10,4);
			CONVERT_RECEIPT_AMOUNT	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			VENUE_DECSRIPTION	:String(150);
			SPS_REFERENCE	:String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to SP2_MASTER_CLAIM;
	}

    entity SP3_MASTER_CLAIM {	
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	:String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	:String(50);
		START_DATE	:Date;
		END_DATE	:Date;
		LENGTH_OF_STAY	:Decimal(10,2);
		PURPOSE_OF_TRIP	:String(150);
		TRIP_REMARKS	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CLAIM_AMOUNT_BEFORE_CAPPING	:Decimal(10,2);
		CLAIM_AMOUNT	:Decimal(10,2);
		CLAIM_STATUS	:String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		CATEGORY_CODE	:String(50);
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many SP3_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
		entity SP3_LINEITEM_CLAIM {	
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			RECEIPT_AMOUNT	:Decimal(10,2);
			RECEIPT_DATE	:Date;
			EXPENSE_TYPE	:String(50);
			DESCRIPTION	:String(50);
			RECEIPT_NUMBER	:String(50);
			CURRENCY	:String(50);
			EXCHANGE_RATE	:Decimal(10,4);
			CONVERT_RECEIPT_AMOUNT	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			VENUE_DECSRIPTION	:String(150);
			SPS_REFERENCE	:String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to SP3_MASTER_CLAIM;
	}
	
	entity SDFC_MASTER_CLAIM{
	key	EMPLOYEE_ID	: String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE	: String(50);
	key	CLAIM_DATE	:Date;
	key	CLAIM_CATEGORY	: String(150);
		CATEGORY_CODE	: String(50);
		CLAIM_STATUS	: String(50);
		CLAIM_AMOUNT	: Decimal(10,2);
		SDF_REFERENCE	: String(50);
		SDF_APPROVED_AMOUNT	: Decimal(10,2);
		PAY_TO_BANK	: String(50);
		ACC_NAME	: String(50);
		ACC_NO	: String(50);
		BANK_CURRENCY : String(50);
		SDFR_CURRENCY : String(50);
		TOTAL_CLAIM_AMOUNT	:Decimal(10,2);
		VENDOR_CODE	: String(50);
		GL_ACCOUNT	: String(50);
		FIRST_LEVEL_APPROVER : String(50);
		SECOND_LEVEL_APPROVER: String(50);
		THIRD_LEVEL_APPROVER	: String(50);
		FOURTH_LEVEL_APPROVER	: String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON :Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		FOURTH_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON :Date;
		SUBMITTED_BY : String(50);
		ORIGINAL_CLAIM_REFERENCE: String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER4	: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		BEHALF_FLAG	: String(10);
		LINE_ITEM:Composition of many SDFC_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	
	entity SDFC_LINEITEM_CLAIM {	
		key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key	CLAIM_REFERENCE	:String(50);
		key	LINE_ITEM_REFERENCE_NUMBER	:String(50);
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
			ITEM_DESC	:String(256);
			EXCHANGE_RATE	:Decimal(10,2);
			INVOICE_DATE	:Date;
			INVOICE_NUMBER	:String(50);
			CURRENCY	:String(10);
			POST_CURRENCY :String(10);
			POST_CLAIM_AMOUNT :Decimal(10,2);
			CLAIM_AMOUNT_SGD	:Decimal(10,2);
			CLAIM_AMOUNT	:Decimal(10,2);
			POST_DATE :Date;
			ITEM_LINE_REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to SDFC_MASTER_CLAIM;
	}
	
	
	entity SDFR_MASTER_CLAIM{
		key EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key CLAIM_REFERENCE	:String(50);
		key CLAIM_DATE	:Date;
		key CLAIM_CATEGORY	:String(150);
			CATEGORY_CODE	:String(50);
			CLAIM_STATUS	:String(50);
			CLAIM_AMOUNT	:Decimal(10,2);
			CURRENCY		:String(50);
			ORG_CLAIM_AMOUNT: Decimal(10,2);
			COURSE_END_DATE	:Date;
			CUMULATIVE_CAP	:String(50);
			QUALIFY	:String(50);
			PROGRAM_NAME	:String(256);
			PRG_START_DATE	:Date;
			PRG_END_DATE	:Date;
			JUSTIFICATION_REQ	:String(4000);
			FIRST_LEVEL_APPROVER	:String(50);
			SECOND_LEVEL_APPROVER	:String(50);
			THIRD_LEVEL_APPROVER	:String(50);
			FOURTH_LEVEL_APPROVER	:String(50);
			FIRST_LEVEL_APPROVED_ON	:Date;
			SECOND_LEVEL_APPROVED_ON :Date;
			THIRD_LEVEL_APPROVED_ON	:Date;
			FOURTH_LEVEL_APPROVED_ON	:Date;
			CREATED_ON	:Date;
			SUBMITTED_ON :Date;
			SUBMITTED_BY :String(50);
			ORIGINAL_CLAIM_REFERENCE: String(50);
			REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			REMARKS_APPROVER4	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION 
			REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			BEHALF_FLAG	:String(10);
			LINE_ITEM:Composition of many SDFR_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity SDFR_LINEITEM_CLAIM{
	key	EMPLOYEE_ID :String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key	CLAIM_REFERENCE :String(50);
	key	CLAIM_CODE	:String(50);
	key	CLAIM_CATEGORY	:String(50);
	key	CLAIM_DATE	:Date;
	key	LINE_ITEM_REFERENCE_NUMBER :String(50);
		CLAIM_AMOUNT :Decimal(10,2);
		ITEM_DESC :String(256);
		ESTIMATE_COST :Decimal(10,2);
		CURRENCY :String(10);
		EST_COST_SGD :Decimal(10,2);
		ITEM_LINE_REMARKS_EMPLOYEE :String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		parent: Association to SDFR_MASTER_CLAIM;
	}
	
	entity CPC_MASTER_CLAIM{
	key	EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key CLAIM_REFERENCE	:String(50);
	key CLAIM_DATE	:Date;
	key CLAIM_CATEGORY	:String(50);
		CATEGORY_CODE	:String(50);
		CLAIM_STATUS   :String(50);
		CLAIM_AMOUNT	:Decimal(10,2);
		CPR_REFERENCE	:String(50);
		PAY_TO_BANK	:String(50);
		ACC_NAME	:String(50);
		ACC_NO	:String(50);
		BANK_CURRENCY	:String(50);
		TOTAL_CLAIM_AMOUNT	:Decimal(10,2);
		VENDOR_CODE	:String(50);
		GL_ACCOUNT	:String(50);
		CPR_AMOUNT :Decimal(10,2);
		CPR_CURRENCY :String(50);
		CURRENCY :String(50);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FOURTH_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON :Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		FOURTH_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON	:Date;
		SUBMITTED_BY	:String(50);
		ORIGINAL_CLAIM_REFERENCE: String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER4	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many CPC_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity CPC_LINEITEM_CLAIM{
		key	EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
		key CLAIM_REFERENCE	:String(50) ;
		key	CLAIM_CODE	:String(50);
		key	CLAIM_CATEGORY	:String(50);
		key	CLAIM_DATE	:Date;
		key LINE_ITEM_REFERENCE_NUMBER	:String(50) ;
			CLAIM_AMOUNT	:Decimal(10,2);
			ITEM_DESC	:String(256);
			INVOICE_DATE	: Date;
			INVOICE_NUMBER	:String(50) ;
			EXCHANGE_RATE	:Decimal(10,2);
			CURRENCY	:String(10) ;
			POST_CURRENCY	:String(10); 
			POST_CLAIM_AMOUNT :Decimal(10,2);
			POST_DATE	:Date;
			CLAIM_AMOUNT_SGD :Decimal(10,2);
			ITEM_LINE_REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
			parent: Association to CPC_MASTER_CLAIM;
	}
	
	entity OC_MASTER_CLAIM{
	key	EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key CLAIM_REFERENCE	:String(50);
	key CLAIM_DATE	:Date;
	key CLAIM_CATEGORY	:String(150);
		CATEGORY_CODE	:String(50);
		CLAIM_STATUS	:String(50);
		CLAIM_AMOUNT	:Decimal(10,5);
		PAY_TO_BANK	:String(50);
		ACC_NAME	:String(50);
		ACC_NO	:String(50);
		BANK_CURRENCY	:String(50);
		TOTAL_CLAIM_AMOUNT	:Decimal(10,5);
		VENDOR_CODE :String(50);
		GL_ACCOUNT	:String(50);
		CURRENCY :String(50);
		REMARK :String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FOURTH_LEVEL_APPROVER	:String(50);
		FIRST_LEVEL_APPROVED_ON	: Date;
		SECOND_LEVEL_APPROVED_ON	: Date;
		THIRD_LEVEL_APPROVED_ON	: Date;
		FOURTH_LEVEL_APPROVED_ON	: Date;
		CREATED_ON	: Date;
		SUBMITTED_ON	: Date;
		SUBMITTED_BY	:String(50);
		ORIGINAL_CLAIM_REFERENCE: String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER4	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		BEHALF_FLAG	:String(10);
		LINE_ITEM:Composition of many OC_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity OC_LINEITEM_CLAIM{
	key	EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key CLAIM_REFERENCE	:String(50);
	key	CLAIM_CODE	:String(50);
	key	CLAIM_CATEGORY	:String(50);
	key	CLAIM_DATE	:Date;
	key LINE_ITEM_REFERENCE_NUMBER	:String(50);
		CLAIM_AMOUNT	:Decimal(10,2);
		ITEM_DESC	:String(256);
		INVOICE_DATE	:Date;
		INVOICE_NUMBER	:String(50);
		EXCHANGE_RATE	:Decimal(10,2);
		CURRENCY	:String(10);
		POST_CURRENCY	:String(10);
		POST_CLAIM_AMOUNT	:Decimal(10,2);
		POST_DATE	:Date;
		CLAIM_AMOUNT_SGD	:Decimal(10,2);
		ITEM_LINE_REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		parent: Association to OC_MASTER_CLAIM;
	}
	
	entity PAY_UP_MASTER_CLAIM{
	key	EMPLOYEE_ID	:String(50)  @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
    key CLAIM_REFERENCE	:String(50);
    key CLAIM_DATE	:Date;
    key CLAIM_CATEGORY	:String(150);
		CATEGORY_CODE	:String(50);
		CLAIM_STATUS	:String(50);
		CLAIM_AMOUNT    :Decimal(10,2);
		PAYMENT	:String(50);
		// SCHOLAR_UNIV :String(150);
		// SCHOLAR_DISC :String(150);
		// SCHOLAR_SCHEME :String(150);
		FIRST_LEVEL_APPROVER	:String(50);
		SECOND_LEVEL_APPROVER	:String(50);
		THIRD_LEVEL_APPROVER	:String(50);
		FOURTH_LEVEL_APPROVER	   :String(50);
		FIRST_LEVEL_APPROVED_ON	:Date;
		SECOND_LEVEL_APPROVED_ON	:Date;
		THIRD_LEVEL_APPROVED_ON	:Date;
		FOURTH_LEVEL_APPROVED_ON	:Date;
		CREATED_ON	:Date;
		SUBMITTED_ON :Date;
		SUBMITTED_BY :String(50);
		ORIGINAL_CLAIM_REFERENCE: String(50);
		REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER1	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER2	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER3	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_APPROVER4	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		REMARKS_REJECTION	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		BEHALF_FLAG		:String(10);
		LINE_ITEM:Composition of many PAY_UP_LINEITEM_CLAIM on $self=LINE_ITEM.parent;
	}
	
	entity PAY_UP_LINEITEM_CLAIM{
	key	EMPLOYEE_ID	:String(50) @assert.format:'^((?!undefined).)*$';//avoid insertion of undefined
	key CLAIM_REFERENCE	:String(50);
	key	CLAIM_CODE	:String(50);
	key	CLAIM_CATEGORY	:String(50);
	key	CLAIM_DATE	:Date;
	key LINE_ITEM_REFERENCE_NUMBER	:String(50);
		CLAIM_AMOUNT :Decimal(10,2);
		ITEM_DESC	:String(256);
		INVOICE_DATE :Date;
		INVOICE_NUMBER	:String(50);
		EXCHANGE_RATE	:Decimal(10,2);
		CURRENCY	:String(10);
		PAY_TO_BANK	:String(50);
		ACC_NAME	:String(50);
		ACC_NO	:String(50);
		BANK_CURRENCY	:String(50);
		VENDOR_CODE	:String(50);
		GL_ACCOUNT	:String(50);
		POST_CURRENCY	:String(10);
		POST_CLAIM_AMOUNT :Decimal(10,2);
		POST_DATE :Date;
		SCHOLAR_ID :String(50);
		SCHOLAR_NAME :String(150);
		SCHOLAR_UNIV :String(150);
		SCHOLAR_DISC :String(150);
		SCHOLAR_SCHEME :String(150);
		ITEM_LINE_REMARKS_EMPLOYEE	:String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
		parent: Association to PAY_UP_MASTER_CLAIM;
	}
	// define view checkClaimCancel as select from Claim_Status as claimstatus
	// inner join approval as approval
	// on approval.CLAIM_REFERENCE = claimstatus.Claim_Reference
	// {
	// 	key claimstatus.Claim_Reference
	// };
	
	entity DELEGATOR {
	key	START_DATE:Date;
		END_DATE:Date;
	key DELEGATOR_ID :String(50);
	key APPROVER_ID:String(50);
		FIRST_NAME :String(100);
		LAST_NAME:String(100);
		APP_FIRST_NAME:String(100);
		APP_LAST_NAME:String(100);
		CREATED_BY:String(50);
	}
	entity ESTIMATION_PAYMENT {
	key	CLAIM_REFERENCE: String(50);
		ESTIMATEPAYMENTDATE: Date;
	}
	
	entity HR_ADMIN_EMPLOYEE  {
    key  HR_USER: String(50);
    key	 SEQUENCE: String (100);
    	 Personnel_Area: String(100);
    	 Personal_Subarea: String(100);
    	 Pay_Grade:String(50);
    	 Division:String(100);
    	 EMPLOYEE_INCLUDE: Composition of many INC_HRA_EMP
                           on $self = EMPLOYEE_INCLUDE.ADMIN;
    	 EMPLOYEE_EXCLUDE:Composition of many EXC_HRA_EMP
                           on $self = EMPLOYEE_EXCLUDE.ADMIN;
    }
    
    entity INC_HRA_EMP {
    	key UserID: String(50);
    	key ADMIN: Association to HR_ADMIN_EMPLOYEE;
    }
    
    entity EXC_HRA_EMP {
       key  UserID: String(50);
       key  ADMIN: Association to HR_ADMIN_EMPLOYEE;
    }
    
    entity EMAIL_TEMPLATE {
    	key ID: String(50);
    	CATEGORY_CODE: String(50);
    	CLAIM_STATUS: String(50);
    	RECIPIENT: String(256);
    	EMAIL_SUBJECT: String;
    	EMAIL_BODY: String;
    }
    
    entity GL_MAPPING{
    	key START_DATE : Date;
		key END_DATE  :  Date;	
		key GL_ACC:String(10);	
		SCHOLAR_SCHEME:String(200);	
    }
    
    entity VENDOR{
    	key START_DATE : Date;
		key END_DATE  :  Date;	
		key VENDOR_CODE:String(50);	
		    VENDOR_DESC:String(150);	
			SCHOLAR_SCHEME:String(200);	
    }
    
    entity CURRENCY{
    	key START_DATE : Date;
		key END_DATE  :  Date;	
		key CURRENCY:String(10);	
		RATE:Decimal(10,4);	
    }
    entity REROUTE_HISTORY{
    	key CLAIM_REFERENCE	:String(50);
    	key	CURRENT_APPROVER:String(20);
    	key	LEVEL:String(10);
    		REROUTED_APPROVER:String(20);
    		ROUTED_ON:DateTime;
    		ROUTED_BY:String(20);
    		ROUTE_COMMENTS: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
    }
    
    entity ADMIN_TILE_LIST{
    	key TILE_CODE: String;
    		TILE_DESC: String(100);
    }
    
    define view Claim_Employee_Company as select from Claim_Status as status
    left join sf.EmpJob as Job
    on status.Owner = Job.userId
    and Job.startDate <= TO_SECONDDATE (CONCAT(status.Submit_Date, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
	and Job.endDate >= TO_SECONDDATE (CONCAT(status.Submit_Date, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
	{
		key status.Claim_Reference,
			status.Owner,
			Job.company,
			CASE WHEN  status.Status = 'Approved' and status.Total_Level = 1  THEN  status.FIRST_LEVEL_APPROVED_ON 
				 WHEN  status.Status = 'Approved' and status.Total_Level = 2  THEN  status.SECOND_LEVEL_APPROVED_ON
				 WHEN  status.Status = 'Approved' and status.Total_Level = 3  THEN  status.THIRD_LEVEL_APPROVED_ON
				 WHEN  status.Status = 'Approved' and status.Total_Level = 4  THEN  status.FOURTH_LEVEL_APPROVED_ON
				 ELSE  status.Submit_Date END as Approved_Date : Date
		
	};
    
	define view Approval_Histroy as select from approval as approval
	//Posting Cut off
	inner join Claim_Employee_Company as Claim_emp_comp
	on Claim_emp_comp.Claim_Reference = approval.CLAIM_REFERENCE
	// end Posting
	left join ESTIMATION_PAYMENT as estpay
	on estpay.CLAIM_REFERENCE = approval.CLAIM_REFERENCE
	left join sf.Replication_Logs as  Replication_Logs
	on (approval.CLAIM_REFERENCE = Replication_Logs.Internal_Claim_Reference)
	// inner join sf.PerPersonalView as empName
	inner join sf.PerPersonalView as empName
	on empName.personIdExternal = approval.CLAIM_OWNER_ID
	// and empName.startDate <= $now
	//Posting Cut off
	left join sf.claimPostingCutoff as cutOff
	on cutOff.company = Claim_emp_comp.company
	and cutOff.claimFinalApprovalDateFrom <= Claim_emp_comp.Approved_Date
	and cutOff.claimFinalApprovalDateTo >= Claim_emp_comp.Approved_Date
	//Posting Cut off
distinct{
	key  Replication_Logs.Claim_Ref_Number,
	key  approval.CLAIM_REFERENCE,
		 Replication_Logs.Rep_Status,
    	 approval.EMPLOYEE_ID,
    	 approval.EMPLOYEE_NAME,
    	 approval.CLAIM_TYPE,
    	 approval.CLAIM_DATE,
    	 approval.AMOUNT,
    	 approval.CLAIM_STATUS,
    	 approval.CATEGORY_CODE,
    	 approval.CLAIM_OWNER_ID,
    	 approval.CLAIM_CATEGORY,
    	 approval.SUBMITTED_BY,
    	 CASE WHEN  estpay.ESTIMATEPAYMENTDATE IS NULL or estpay.ESTIMATEPAYMENTDATE = ''  THEN approval.ESTIMATEPAYMENTDATE 
							ELSE estpay.ESTIMATEPAYMENTDATE END as ESTIMATEPAYMENTDATE:String,
    	 approval.RECEIPT_DATE,
    	 empName.firstName as Claim_Owner_FirstName,
    	 empName.lastName  as Claim_Owner_LastName,
    	 empName.fullName as Claim_Owner_FullName,
    	 cutOff.postingCutoffDate
};

define view claim_coord_employee with parameters claim_Cordinator:String(20) as select from CLAIM_COORDINATOR as coordinate
inner join sf.EmpJob as EmpJob
on coordinate.COORDINATOR = :claim_Cordinator
and ((EmpJob.userId = coordinate.EMPLOYEE_ID)
or ((EmpJob.payGrade = coordinate.PAY_GRADE or coordinate.PAY_GRADE = 'ALL' )
and (EmpJob.company = coordinate.PERSONNEL_AREA or coordinate.PERSONNEL_AREA = 'ALL' )
and (EmpJob.location = coordinate.PERSONAL_SUBAREA or coordinate.PERSONAL_SUBAREA = 'ALL' )
and (EmpJob.department = coordinate.EMPLOYEE_DEPARTMENT or coordinate.EMPLOYEE_DEPARTMENT = 'ALL' )
and (EmpJob.division = coordinate.EMPLOYEE_DIVISION or coordinate.EMPLOYEE_DIVISION = 'ALL' )
and (EmpJob.customString4 = coordinate.SPONSOR_INSTITUTION or coordinate.SPONSOR_INSTITUTION = 'ALL' )
and (EmpJob.customString3 = coordinate.SPECIALISATION or coordinate.SPECIALISATION = 'ALL' )))
and EmpJob.startDate <= $now
and EmpJob.endDate >= $now
left join sf.PerPersonalView as perperson
on perperson.personIdExternal = EmpJob.userId
distinct
{
	key EmpJob.userId as EmployeeID,
		perperson.firstName,
    	perperson.lastName,
    	perperson.fullName
}
where coordinate.STARTDATE <= CURRENT_DATE 
and coordinate.ENDDATE >= CURRENT_DATE;

							
				
define view Approval_Claim_Coordinator with parameters claim_Cordinator:String(20) as select from claim_coord_employee(claim_Cordinator: :claim_Cordinator) as coordinate_employee
inner join Approval_Histroy as hist
on coordinate_employee.EmployeeID = hist.CLAIM_OWNER_ID
{
	key  hist.Claim_Ref_Number,
	key  hist.CLAIM_REFERENCE,
    	 hist.EMPLOYEE_ID,
    	 hist.EMPLOYEE_NAME,
    	 hist.CLAIM_TYPE,
    	 hist.CLAIM_DATE,
    	 hist.AMOUNT,
    	 hist.CLAIM_STATUS,
    	 hist.CATEGORY_CODE,
    	 hist.CLAIM_OWNER_ID,
    	 hist.CLAIM_CATEGORY,
    	 hist.SUBMITTED_BY,
    	 hist.ESTIMATEPAYMENTDATE,
    	 hist.RECEIPT_DATE,
    	 hist.Claim_Owner_FirstName,
    	 hist.Claim_Owner_LastName
};

define view ITEM_CORD with parameters claim_Cordinator:String(20) as select from PAY_UP_LINEITEM_CLAIM as PAY_ITEM
inner join claim_coord_employee(claim_Cordinator: :claim_Cordinator) as coordinate_employee
on coordinate_employee.EmployeeID = PAY_ITEM.SCHOLAR_ID
inner join Approval_Histroy as hist
on hist.CLAIM_REFERENCE = PAY_ITEM.parent.CLAIM_REFERENCE
{
	     hist.Claim_Ref_Number,
	     hist.CLAIM_REFERENCE,
    	 hist.EMPLOYEE_ID,
    	 hist.EMPLOYEE_NAME,
    	 hist.CLAIM_TYPE,
    	 hist.CLAIM_DATE,
    	 hist.AMOUNT,
    	 hist.CLAIM_STATUS,
    	 hist.CATEGORY_CODE,
    	 hist.CLAIM_OWNER_ID,
    	 hist.CLAIM_CATEGORY,
    	 hist.SUBMITTED_BY,
    	 hist.ESTIMATEPAYMENTDATE,
    	 hist.RECEIPT_DATE,
    	 hist.Claim_Owner_FirstName,
    	 hist.Claim_Owner_LastName
};


define view Approval_Claim_Coordinator_Line  with parameters claim_Cordinator:String(20) as select from Approval_Claim_Coordinator(claim_Cordinator: :claim_Cordinator) as AppHist{*}
WHERE AppHist.CATEGORY_CODE <> 'PAY_UP'
union
select from ITEM_CORD(claim_Cordinator: :claim_Cordinator) as itemcord{*};

define view cancelAfterApproveView as select from Claim_Status as cstatus 
				left join CLAIM_CANCEL_MASTER as cancelmaster 
				ON cstatus.Claim_Reference = cancelmaster.parent.Claim_Reference
				left JOIN Claim_Status AS cstatus_claim
				on cstatus_claim.Claim_Reference = cancelmaster.CLAIM_REFERENCE
				// distinct{
				{
						key	cstatus.Claim_Reference,
							cancelmaster.CLAIM_REFERENCE as cancelreference,
							CASE WHEN  cancelmaster.CLAIM_REFERENCE IS NULL THEN '' 
							ELSE 'X' END as CANCELAFTERAPPROVE:String
} where  cstatus_claim.Status<>'Rejected' and cstatus_claim.Status<>'Cancelled';

define view claimstatus_ext as select from Claim_Status as cstatus 
inner join approval as Approval
on Approval.CLAIM_REFERENCE = cstatus.Claim_Reference
left join sf.PerPersonalView as empName
on empName.personIdExternal = cstatus.Employee_Id
// and empName.startDate <= $now
left join sf.PerPersonalView as approver1
on approver1.personIdExternal = cstatus.Approver1
// and approver1.startDate <= $now
left join sf.PerPersonalView as approver2
on approver2.personIdExternal = cstatus.Approver2
// and approver2.startDate <= $now
left join sf.PerPersonalView as approver3
on approver3.personIdExternal = cstatus.Approver3
// and approver3.startDate <= $now
left join sf.PerPersonalView as approver4
on approver4.personIdExternal = cstatus.Approver4
left join sf.PerPersonalView as delegator1
on delegator1.personIdExternal = cstatus.Delegation1
left join sf.PerPersonalView as delegator2
on delegator2.personIdExternal = cstatus.Delegation2
left join sf.PerPersonalView as delegator3
on delegator3.personIdExternal = cstatus.Delegation3
left join sf.PerPersonalView as delegator4
on delegator4.personIdExternal = cstatus.Delegation4
left join sf.PerPersonalView as route1
on route1.personIdExternal = cstatus.Reroute1
left join sf.PerPersonalView as route2
on route2.personIdExternal = cstatus.Reroute2
left join sf.PerPersonalView as route3
on route3.personIdExternal = cstatus.Reroute3
left join sf.PerPersonalView as route4
on route4.personIdExternal = cstatus.Reroute4
left join sf.PerPersonalView as submittedby
on submittedby.personIdExternal = cstatus.Submitted_By
// and submittedby.startDate <= $now
left join sf.PerEmail as empEmail
on empEmail.personIdExternal = cstatus.Employee_Id
left join sf.PerEmail as approverEmail1
on approverEmail1.personIdExternal = cstatus.Approver1
left join sf.PerEmail as approverEmail2
on approverEmail2.personIdExternal = cstatus.Approver2
left join sf.PerEmail as approverEmail3
on approverEmail3.personIdExternal = cstatus.Approver3
left join sf.PerEmail as approverEmail4
on approverEmail4.personIdExternal = cstatus.Approver4
distinct{
	key	cstatus.Claim_Reference,
		Approval.CLAIM_TYPE,
		Approval.CATEGORY_CODE,
		cstatus.Employee_Id,
		empName.firstName as Employee_FirstName,
    	empName.lastName  as Employee_LastName,
    	empName.fullName as Employee_FullName,
    	empEmail.emailAddress as Employee_Email,
    	cstatus.Submit_Date,
    	cstatus.Status,
    	cstatus.Approver1,
    	approver1.firstName as APPROVER1_FirstName,
    	approver1.lastName  as APPROVER1_LastName,
    	approver1.fullName as APPROVER1_FullName,
    	approverEmail1.emailAddress as APPROVER1_Email,
    	cstatus.Approver2,
    	approver2.firstName as APPROVER2_FirstName,
    	approver2.lastName  as APPROVER2_LastName,
    	approver2.fullName as APPROVER2_FullName,
    	approverEmail2.emailAddress as APPROVER2_Email,
    	cstatus.Approver3,
    	approver3.firstName as APPROVER3_FirstName,
    	approver3.lastName  as APPROVER3_LastName,
    	approver3.fullName as APPROVER3_FullName,
    	approverEmail3.emailAddress as APPROVER3_Email,
    	cstatus.Approver4,
    	approver4.firstName as APPROVER4_FirstName,
    	approver4.lastName  as APPROVER4_LastName,
    	approver4.fullName as APPROVER4_FullName,
    	approverEmail4.emailAddress as APPROVER4_Email,
    	cstatus.Delegation1,
    	delegator1.firstName as DELEGATOR1_FirstName,
    	delegator1.lastName  as DELEGATOR1_LastName,
    	delegator1.fullName  as DELEGATOR1_FullName,
    	cstatus.Delegation2,
    	delegator2.firstName as DELEGATOR2_FirstName,
    	delegator2.lastName  as DELEGATOR2_LastName,
    	delegator2.fullName  as DELEGATOR2_FullName,
    	cstatus.Delegation3,
    	delegator3.firstName as DELEGATOR3_FirstName,
    	delegator3.lastName  as DELEGATOR3_LastName,
    	delegator3.fullName  as DELEGATOR3_FullName,
    	cstatus.Delegation4,
    	delegator4.firstName as DELEGATOR4_FirstName,
    	delegator4.lastName  as DELEGATOR4_LastName,
    	delegator4.fullName  as DELEGATOR4_FullName,
    	cstatus.Reroute1,
    	route1.firstName as REROUTE1_FirstName,
    	route1.lastName  as REROUTE1_LastName,
    	route1.fullName  as REROUTE1_FullName,
    	cstatus.Reroute2,
    	route2.firstName as REROUTE2_FirstName,
    	route2.lastName  as REROUTE2_LastName,
    	route2.fullName  as REROUTE2_FullName,
    	cstatus.Reroute3,
    	route3.firstName as REROUTE3_FirstName,
    	route3.lastName  as REROUTE3_LastName,
    	route3.fullName  as REROUTE3_FullName,
    	cstatus.Reroute4,
    	route4.firstName as REROUTE4_FirstName,
    	route4.lastName  as REROUTE4_LastName,
    	route4.fullName  as REROUTE4_FullName,
    	cstatus.Submitted_By,
    	submittedby.firstName as SUBMITTEDBY_FirstName,
    	submittedby.lastName  as SUBMITTEDBY_LastName,
    	submittedby.fullName  as SUBMITTEDBY_FullName,
    	cstatus.FIRST_LEVEL_APPROVED_ON,
    	cstatus.SECOND_LEVEL_APPROVED_ON,
    	cstatus.THIRD_LEVEL_APPROVED_ON,
    	cstatus.FOURTH_LEVEL_APPROVED_ON,
    	cstatus.Response_Date,
    	cstatus.Owner,
    	cstatus.Total_Level,
    	cstatus.Current_Level,
    	cstatus.REMARKS_EMPLOYEE,
    	cstatus.REMARKS_APPROVER1,
    	cstatus.REMARKS_APPROVER2,
    	cstatus.REMARKS_APPROVER3,
    	cstatus.REMARKS_APPROVER4,
    	cstatus.REMARKS_REJECTION,
    	cstatus.Cancel_flag,
    	Approval.CLAIM_CATEGORY
};

define view LINEITEM_EMPLOYEE with parameters EMP_LINEITEM:String(20) as select from PAY_UP_LINEITEM_CLAIM as PAY_ITEM
inner join app_histwithCancel as hist 
on hist.CLAIM_REFERENCE = PAY_ITEM.parent.CLAIM_REFERENCE
{
	     hist.Claim_Ref_Number,
	     hist.CLAIM_REFERENCE,
    	 hist.EMPLOYEE_ID,
    	 hist.EMPLOYEE_NAME,
    	 hist.CLAIM_TYPE,
    	 hist.CLAIM_DATE,
    	 hist.AMOUNT,
    	 hist.CLAIM_STATUS,
    	 hist.CATEGORY_CODE,
    	 hist.CLAIM_OWNER_ID,
    	 hist.CLAIM_CATEGORY,
    	 hist.SUBMITTED_BY,
    	 hist.ESTIMATEPAYMENTDATE,
    	 hist.RECEIPT_DATE,
    	 hist.Claim_Owner_FirstName,
    	 hist.Claim_Owner_LastName,
    	 hist.Claim_Owner_FullName,
    	 hist.Rep_Status,
    	 hist.postingCutoffDate,
    	 hist.CANCELAFTERAPPROVE,
    	 hist.cancelreference,
    	 hist.Delegation1,
    	 hist.Delegation2,
    	 hist.Delegation3,
    	 hist.Delegation4,
    	 hist.Reroute1,
    	 hist.Reroute2,
    	 hist.Reroute3,
    	 hist.Reroute4,
    	 hist.Response_Date,
    	 hist.Total_Level,
    	 hist.Current_Level,
    	 hist.APPROVER1_STATUS,
    	 hist.APPROVER2_STATUS,
    	 hist.APPROVER3_STATUS,
    	 hist.Approver1,
    	 hist.Approver2,
    	 hist.Approver3,
    	 hist.Approver4,
    	 hist.payGrade,
	     hist.Personel_Area,
		 hist.Personel_SubArea,
		 hist.department,
		 hist.division,
		 hist.SPONSOR_INSTITUTION, 
		 hist.SPECIALISATION,
		 hist.LINE_CLAIM_CODE,
	     hist.LINE_CLAIM_CATEGORY,
		 hist.LINE_ITEM_CLAIMAMT,
		 hist.LINE_ITEM_DESC,
		 hist.LINE_INVDATE,
		 hist.LINE_ITEM_INVNUMBER,
		 hist.LINE_ITEM_CURRENCY
		 
		 
} where PAY_ITEM.SCHOLAR_ID =:EMP_LINEITEM;
// or PAY_ITEM.CLAIM_REFERENCE =:CLAIM_REFERENCE 
// or hist.CLAIM_OWNER_ID =:EMP_LINEITEM;

define view app_histwithlineItem with parameters EMP_LINEITEM:String(20) as select from LINEITEM_EMPLOYEE(EMP_LINEITEM : :EMP_LINEITEM) as PAY_ITEM {*} 
UNION
select from app_histwithCancel as hist {*} 
where hist.CLAIM_OWNER_ID =:EMP_LINEITEM
and hist.CATEGORY_CODE <> 'PAY_UP';

define view app_histwithlineItem_ClaimSearch with parameters EMP_LINEITEM:String(20) as select from app_histwithlineItem(EMP_LINEITEM : :EMP_LINEITEM) as PAY_ITEM
left join listof_lineitems_all as lineitem
on lineitem.PARENT_CLAIM_REF =  PAY_ITEM.CLAIM_REFERENCE
{
		 PAY_ITEM.Claim_Ref_Number,
	     PAY_ITEM.CLAIM_REFERENCE,
    	 PAY_ITEM.EMPLOYEE_ID,
    	 PAY_ITEM.EMPLOYEE_NAME,
    	 PAY_ITEM.CLAIM_TYPE,
    	 PAY_ITEM.CLAIM_DATE,
    	 PAY_ITEM.AMOUNT,
    	 PAY_ITEM.CLAIM_STATUS,
    	 PAY_ITEM.CATEGORY_CODE,
    	 PAY_ITEM.CLAIM_OWNER_ID,
    	 PAY_ITEM.CLAIM_CATEGORY,
    	 PAY_ITEM.SUBMITTED_BY,
    	 PAY_ITEM.ESTIMATEPAYMENTDATE,
    	 PAY_ITEM.RECEIPT_DATE,
    	 PAY_ITEM.Claim_Owner_FirstName,
    	 PAY_ITEM.Claim_Owner_LastName,
    	 PAY_ITEM.Claim_Owner_FullName,
    	 PAY_ITEM.Rep_Status,
    	 PAY_ITEM.postingCutoffDate,
    	 PAY_ITEM.CANCELAFTERAPPROVE,
    	 PAY_ITEM.cancelreference,
    	 PAY_ITEM.Delegation1,
    	 PAY_ITEM.Delegation2,
    	 PAY_ITEM.Delegation3,
    	 PAY_ITEM.Delegation4,
    	 PAY_ITEM.Reroute1,
    	 PAY_ITEM.Reroute2,
    	 PAY_ITEM.Reroute3,
    	 PAY_ITEM.Reroute4,
    	 PAY_ITEM.Response_Date,
    	 PAY_ITEM.Total_Level,
    	 PAY_ITEM.Current_Level,
    	 PAY_ITEM.APPROVER1_STATUS,
    	 PAY_ITEM.APPROVER2_STATUS,
    	 PAY_ITEM.APPROVER3_STATUS,
    	 PAY_ITEM.Approver1,
    	 PAY_ITEM.Approver2,
    	 PAY_ITEM.Approver3,
    	 PAY_ITEM.Approver4,
    	 PAY_ITEM.payGrade,
	     PAY_ITEM.Personel_Area,
		 PAY_ITEM.Personel_SubArea,
		 PAY_ITEM.department,
		 PAY_ITEM.division,
		 PAY_ITEM.SPONSOR_INSTITUTION, 
		 PAY_ITEM.SPECIALISATION,
		 PAY_ITEM.LINE_CLAIM_CODE,
		 PAY_ITEM.LINE_CLAIM_CATEGORY,
		 PAY_ITEM.LINE_ITEM_CLAIMAMT,
		 PAY_ITEM.LINE_ITEM_DESC,
		 PAY_ITEM.LINE_INVDATE,
		 PAY_ITEM.LINE_ITEM_INVNUMBER,
		 PAY_ITEM.LINE_ITEM_CURRENCY, 
		 lineitem.CLAIM_REFERENCE as Line_claim_reference
};


define view listof_lineitems_all  as select from WRC_HR_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
	CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS CURRENCY:String,
    CLAIM_AMOUNT
}
union
select from WRC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS CURRENCY:String,
	CLAIM_AMOUNT
}
union
select from TC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS CURRENCY:String,
	CLAIM_AMOUNT
}
union
select from COV_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS CURRENCY:String,
	CLAIM_AMOUNT
}
union
select from SP_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from SP1_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from SP2_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from SP3_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from SDFC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from SDFR_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	case when CLAIM_CODE IS NOT NULL then ''
    end AS ITEM_DESC:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_DATE:String,
    case when CLAIM_CODE IS NOT NULL then ''
    end AS INVOICE_NUMBER:String,
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from CPC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	ITEM_DESC,
	INVOICE_DATE, 
	INVOICE_NUMBER, 
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from OC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	ITEM_DESC,
	INVOICE_DATE, 
	INVOICE_NUMBER, 
	CURRENCY, 
	CLAIM_AMOUNT
}
union
select from CPC_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	ITEM_DESC,
	INVOICE_DATE, 
	INVOICE_NUMBER, 
	CURRENCY, 
	CLAIM_AMOUNT
}
union 
select from PAY_UP_LINEITEM_CLAIM {
	parent.CLAIM_REFERENCE as PARENT_CLAIM_REF,
	CLAIM_REFERENCE,
		CLAIM_CODE,
	CLAIM_CATEGORY,
	ITEM_DESC,
	INVOICE_DATE, 
	INVOICE_NUMBER, 
	CURRENCY, 
	CLAIM_AMOUNT
};


// define view claim_referencefilter with parameters claim_array : array of {CLAIM_REFERNECE:String(50)} as select from listof_lineitems_all{*}
// where CLAIM_REFERENCE in :claim_array;

define view listwithclaimMax as select from listof_lineitems_all as lineitem
{
		max(lineitem.CLAIM_REFERENCE) as CLAIM_REF,
		   lineitem.PARENT_CLAIM_REF
	
} group by lineitem.PARENT_CLAIM_REF;

define view listwithclaimDetailsneeded as select from listwithclaimMax as max
inner join  listof_lineitems_all as lineall 
on lineall.PARENT_CLAIM_REF=max.PARENT_CLAIM_REF
AND lineall.CLAIM_REFERENCE = max.CLAIM_REF{
	lineall.CLAIM_CODE,
	lineall.CLAIM_CATEGORY,
	lineall.ITEM_DESC, 
	lineall.INVOICE_DATE, 
	lineall.INVOICE_NUMBER, 
	lineall.CURRENCY, 
	lineall.CLAIM_AMOUNT,
	max.CLAIM_REF,
	max.PARENT_CLAIM_REF
};

define view app_histwithCancel as select from Approval_Histroy as hist
left join cancelAfterApproveView as withCancel
on withCancel.Claim_Reference = hist.CLAIM_REFERENCE 
inner join Claim_Status as cstatus
on cstatus.Claim_Reference = hist.CLAIM_REFERENCE
left join sf.EmpJob as EmpJob
on hist.CLAIM_OWNER_ID = EmpJob.userId
and EmpJob.startDate <= $now
and EmpJob.endDate >= $now
left join listwithclaimDetailsneeded as claimItemMax
on claimItemMax.PARENT_CLAIM_REF = hist.CLAIM_REFERENCE
{
	key  hist.Claim_Ref_Number,
	key  hist.CLAIM_REFERENCE,
    	 hist.EMPLOYEE_ID,
    	 hist.EMPLOYEE_NAME,
    	 hist.CLAIM_TYPE,
    	 hist.CLAIM_DATE,
    	 hist.AMOUNT,
    	 hist.CLAIM_STATUS,
    	 hist.CATEGORY_CODE,
    	 hist.CLAIM_OWNER_ID,
    	 hist.CLAIM_CATEGORY,
    	 hist.SUBMITTED_BY,
    	 hist.ESTIMATEPAYMENTDATE,
    	 hist.RECEIPT_DATE,
    	 hist.Claim_Owner_FirstName,
    	 hist.Claim_Owner_LastName,
    	 hist.Claim_Owner_FullName,
    	 hist.Rep_Status,
    	 hist.postingCutoffDate,
    	 withCancel.CANCELAFTERAPPROVE,
    	 withCancel.cancelreference,
    	 cstatus.Delegation1,
    	 cstatus.Delegation2,
    	 cstatus.Delegation3,
    	 cstatus.Delegation4,
    	 cstatus.Reroute1,
    	 cstatus.Reroute2,
    	 cstatus.Reroute3,
    	 cstatus.Reroute4,
    	 cstatus.Response_Date,
    	 cstatus.Total_Level,
    	 cstatus.Current_Level,
    	 case when cstatus.Current_Level > 1 then cstatus.Approver1
    	 else null end  APPROVER1_STATUS :String,
    	 case when cstatus.Current_Level > 2 then cstatus.Approver2
    	 else null end  APPROVER2_STATUS :String,
    	 case when cstatus.Current_Level > 3 then cstatus.Approver3
    	 else null end  APPROVER3_STATUS :String,
    	 cstatus.Approver1,
    	 cstatus.Approver2,
    	 cstatus.Approver3,
    	 cstatus.Approver4,
    	 EmpJob.payGrade,
	     EmpJob.company as Personel_Area,
		 EmpJob.location as Personel_SubArea,
		 EmpJob.department,
		 EmpJob.division,
		 EmpJob.customString4 as SPONSOR_INSTITUTION, 
		 EmpJob.customString3 as SPECIALISATION,
		 claimItemMax.CLAIM_CODE as LINE_CLAIM_CODE,
		 claimItemMax.CLAIM_CATEGORY as LINE_CLAIM_CATEGORY,
		 claimItemMax.CLAIM_AMOUNT as LINE_ITEM_CLAIMAMT,
		 claimItemMax.ITEM_DESC as LINE_ITEM_DESC,
		 claimItemMax.INVOICE_DATE as LINE_INVDATE,
		 claimItemMax.INVOICE_NUMBER as LINE_ITEM_INVNUMBER,
		 claimItemMax.CURRENCY as LINE_ITEM_CURRENCY
};

define view app_delegation with parameters delegator_id:String(20) as select from app_histwithCancel as hist
inner join DELEGATOR as delegator 
on hist.EMPLOYEE_ID = delegator.APPROVER_ID
{
			 hist.Claim_Ref_Number,
			 hist.CLAIM_REFERENCE,
	    	 hist.EMPLOYEE_ID,
	    	 hist.EMPLOYEE_NAME,
	    	 hist.CLAIM_TYPE,
	    	 hist.CLAIM_DATE,
	    	 hist.AMOUNT,
	    	 hist.CLAIM_STATUS,
	    	 hist.CATEGORY_CODE,
	    	 hist.CLAIM_OWNER_ID,
	    	 hist.CLAIM_CATEGORY,
	    	 hist.SUBMITTED_BY,
	    	 hist.ESTIMATEPAYMENTDATE,
	    	 hist.RECEIPT_DATE,
	    	 hist.Claim_Owner_FirstName,
	    	 hist.Claim_Owner_LastName,
	    	 hist.Claim_Owner_FullName,
	    	 hist.Rep_Status,
	    	 hist.CANCELAFTERAPPROVE,
	    	 hist.cancelreference,
	    	 hist.Delegation1,
	    	 hist.Delegation2,
	    	 hist.Delegation3,
	    	 hist.Delegation4,
	    	 hist.Reroute1,
	    	 hist.Reroute2,
	    	 hist.Reroute3,
	    	 hist.Reroute4,
	    	 hist.Response_Date,
	    	 hist.Total_Level,
	    	 hist.Current_Level,
	    	 hist.payGrade,
		     hist.Personel_Area,
			 hist.Personel_SubArea,
			 hist.department,
			 hist.division,
			 hist.SPONSOR_INSTITUTION, 
			 hist.SPECIALISATION,
			 hist.LINE_CLAIM_CODE,
			 hist.LINE_CLAIM_CATEGORY
}
where delegator.DELEGATOR_ID = :delegator_id
AND delegator.START_DATE <= $now
and delegator.END_DATE >= $now;

define view SDFRandClaim  as select from SDFR_MASTER_CLAIM as SDFR
left join SDFC_MASTER_CLAIM as SDFC 
on SDFR.CLAIM_REFERENCE <> SDFC.SDF_REFERENCE
{
			SDFR.EMPLOYEE_ID,
			SDFR.CLAIM_REFERENCE,
			SDFR.CLAIM_DATE,
			SDFR.CLAIM_CATEGORY,
			SDFR.CATEGORY_CODE,
			SDFR.CLAIM_STATUS,
			SDFR.CLAIM_AMOUNT,
			SDFR.COURSE_END_DATE,
			SDFR.CUMULATIVE_CAP,
			SDFR.QUALIFY,
			SDFR.PROGRAM_NAME,
			SDFR.PRG_START_DATE,
			SDFR.PRG_END_DATE,
			SDFR.JUSTIFICATION_REQ,
			SDFR.FIRST_LEVEL_APPROVER,
			SDFR.SECOND_LEVEL_APPROVER,
			SDFR.THIRD_LEVEL_APPROVER,
			SDFR.FOURTH_LEVEL_APPROVER,
			SDFR.FIRST_LEVEL_APPROVED_ON,
			SDFR.SECOND_LEVEL_APPROVED_ON,
			SDFR.THIRD_LEVEL_APPROVED_ON,
			SDFR.FOURTH_LEVEL_APPROVED_ON,
			SDFR.CREATED_ON,
			SDFR.SUBMITTED_ON ,
			SDFR.SUBMITTED_BY,
			SDFR.REMARKS_EMPLOYEE,
			SDFR.REMARKS_APPROVER1,
			SDFR.REMARKS_APPROVER2,
			SDFR.REMARKS_APPROVER3,
			SDFR.REMARKS_APPROVER4,
			SDFR.REMARKS_REJECTION,
			SDFR.BEHALF_FLAG
};

define view sdfandClaim  as select from SDFR_MASTER_CLAIM as SDFR
left join SDFC_MASTER_CLAIM as SDFC 
on SDFR.CLAIM_REFERENCE = SDFC.SDF_REFERENCE
{
			SDFR.EMPLOYEE_ID,
			SDFR.CLAIM_REFERENCE,
			SDFR.CLAIM_DATE,
			SDFR.CLAIM_CATEGORY,
			SDFR.CATEGORY_CODE,
			SDFR.CLAIM_STATUS,
			SDFR.CLAIM_AMOUNT,
			SDFR.COURSE_END_DATE,
			SDFR.CUMULATIVE_CAP,
			SDFR.CURRENCY,
			SDFR.ORG_CLAIM_AMOUNT,
			SDFR.QUALIFY,
			SDFR.PROGRAM_NAME,
			SDFR.PRG_START_DATE,
			SDFR.PRG_END_DATE,
			SDFR.JUSTIFICATION_REQ,
			SDFR.FIRST_LEVEL_APPROVER,
			SDFR.SECOND_LEVEL_APPROVER,
			SDFR.THIRD_LEVEL_APPROVER,
			SDFR.FOURTH_LEVEL_APPROVER,
			SDFR.FIRST_LEVEL_APPROVED_ON,
			SDFR.SECOND_LEVEL_APPROVED_ON,
			SDFR.THIRD_LEVEL_APPROVED_ON,
			SDFR.FOURTH_LEVEL_APPROVED_ON,
			SDFR.CREATED_ON,
			SDFR.SUBMITTED_ON ,
			SDFR.SUBMITTED_BY,
			SDFR.REMARKS_EMPLOYEE,
			SDFR.REMARKS_APPROVER1,
			SDFR.REMARKS_APPROVER2,
			SDFR.REMARKS_APPROVER3,
			SDFR.REMARKS_APPROVER4,
			SDFR.REMARKS_REJECTION,
			SDFR.BEHALF_FLAG,
			CASE WHEN SDFC.CLAIM_REFERENCE is null then 'X'
			else 'Y' end AVAILABLECHECK :String
};

define view cprandclaim  as select from CPR_CLAIM as CPR
left join CPC_MASTER_CLAIM as CPC 
on CPR.CLAIM_REFERENCE = CPC.CPR_REFERENCE{
	CPR.EMPLOYEE_ID	,
		 CPR.CLAIM_REFERENCE,	
		 CPR.CLAIM_DATE,
		 CPR.CLAIM_CODE,
			CPR.CLAIM_CATEGORY,	
			CPR.CATEGORY_CODE,	
			CPR.CLAIM_STATUS,	
			CPR.CLAIM_AMOUNT,
			CPR.TEMPLATE,
			CPR.CURRENCY,	
			CPR.FIRST_LEVEL_APPROVER,
			CPR.SECOND_LEVEL_APPROVER,
			CPR.THIRD_LEVEL_APPROVER,	
			CPR.FOUR_LEVEL_APPROVER,
			CPR.FIRST_LEVEL_APPROVED_ON,	
			CPR.SECOND_LEVEL_APPROVED_ON,	
			CPR.THIRD_LEVEL_APPROVED_ON,
			CPR.FOUR_LEVEL_APPROVED_ON,
			CPR.CREATED_ON,
			CPR.SUBMITTED_ON,
			CPR.SUBMITTED_BY,	
			CPR.REMARKS_EMPLOYEE,
			CPR.REMARKS_APPROVER1,
			CPR.REMARKS_APPROVER2,
			CPR.REMARKS_APPROVER3,	
			CPR.REMARKS_APPROVER4,	
			CPR.REMARKS_REJECTION,
			CPR.BEHALF_FLAG	,
			CASE WHEN CPC.CLAIM_REFERENCE is null then 'X'
			else 'Y' end AVAILABLECHECK :String
	
};

define view GL_details as select from sf.SCHOLAR_SCHEME as sch
inner join GL_MAPPING as GL 
on GL.SCHOLAR_SCHEME=sch.cust_scholarshipScheme
LEFT JOIN sf.BANK_ACC as BANK
on sch.externalCode= BANK.externalCode
LEFT JOIN VENDOR as VENDOR
on VENDOR.SCHOLAR_SCHEME= sch.cust_scholarshipScheme{
	GL.GL_ACC,
	GL.START_DATE,
	GL.END_DATE,
	sch.externalCode,
	GL.SCHOLAR_SCHEME,
	VENDOR.VENDOR_CODE,
	BANK.cust_vendorCode
};

define view SMS_PAY_UP_PAYMENT_REPORT as select from PAY_UP_LINEITEM_CLAIM as LINEITEM_TABLE
inner join PAY_UP_MASTER_CLAIM as MASTER_TABLE
on MASTER_TABLE.CLAIM_REFERENCE = LINEITEM_TABLE.parent.CLAIM_REFERENCE and MASTER_TABLE.CLAIM_STATUS!='Pending for Submission'
left join sf.PerPersonal as PER_PERSON
on PER_PERSON.personIdExternal = LINEITEM_TABLE.SCHOLAR_ID
left join Claim_Code as CLAIM_CODE
on CLAIM_CODE.Claim_code = LINEITEM_TABLE.CLAIM_CODE
{
key	LINEITEM_TABLE.SCHOLAR_ID as EMPLOYEE_ID, 
	PER_PERSON.firstName as EMPLOYEE_FIRST_NAME,
	PER_PERSON.lastName as EMPLOYEE_LAST_NAME,
	MASTER_TABLE.CLAIM_CATEGORY,
	LINEITEM_TABLE.CLAIM_CODE,
	CLAIM_CODE.Description as CLAIM_DESCRIPTION,
	LINEITEM_TABLE.ACC_NAME,
	LINEITEM_TABLE.ACC_NO,
	LINEITEM_TABLE.VENDOR_CODE,
	LINEITEM_TABLE.GL_ACCOUNT,
	LINEITEM_TABLE.POST_DATE,
	MASTER_TABLE.CLAIM_REFERENCE,
key	LINEITEM_TABLE.LINE_ITEM_REFERENCE_NUMBER,
	LINEITEM_TABLE.ITEM_DESC,
	LINEITEM_TABLE.INVOICE_NUMBER,
	LINEITEM_TABLE.INVOICE_DATE,
	LINEITEM_TABLE.CURRENCY,
	LINEITEM_TABLE.POST_CURRENCY,
	LINEITEM_TABLE.POST_CLAIM_AMOUNT,
	LINEITEM_TABLE.ITEM_LINE_REMARKS_EMPLOYEE,
	MASTER_TABLE.REMARKS_EMPLOYEE,
	MASTER_TABLE.REMARKS_APPROVER1,
	MASTER_TABLE.REMARKS_APPROVER2,
	MASTER_TABLE.REMARKS_APPROVER3,
	MASTER_TABLE.REMARKS_APPROVER4,
	MASTER_TABLE.CLAIM_STATUS,
	MASTER_TABLE.SUBMITTED_ON,
	MASTER_TABLE.SUBMITTED_BY,
	MASTER_TABLE.FIRST_LEVEL_APPROVER,
	MASTER_TABLE.FIRST_LEVEL_APPROVED_ON,
	MASTER_TABLE.SECOND_LEVEL_APPROVER,
	MASTER_TABLE.SECOND_LEVEL_APPROVED_ON,
	MASTER_TABLE.THIRD_LEVEL_APPROVER,
	MASTER_TABLE.THIRD_LEVEL_APPROVED_ON,
	MASTER_TABLE.FOURTH_LEVEL_APPROVER,
	MASTER_TABLE.FOURTH_LEVEL_APPROVED_ON
};

define view SMS_PAYMENT_REPORT as select from SDFC_LINEITEM_CLAIM as LINEITEM_TABLE1
inner join SDFC_MASTER_CLAIM as MASTER_TABLE1
on MASTER_TABLE1.CLAIM_REFERENCE = LINEITEM_TABLE1.parent.CLAIM_REFERENCE and MASTER_TABLE1.CLAIM_STATUS!='Pending for Submission'
left join sf.PerPersonal as PER_PERSON1
on PER_PERSON1.personIdExternal = MASTER_TABLE1.EMPLOYEE_ID
left join Claim_Code as CLAIM_CODE1
on CLAIM_CODE1.Claim_code = LINEITEM_TABLE1.CLAIM_CODE
{
key	MASTER_TABLE1.EMPLOYEE_ID, 
	PER_PERSON1.firstName as EMPLOYEE_FIRST_NAME,
	PER_PERSON1.lastName as EMPLOYEE_LAST_NAME,
	MASTER_TABLE1.CLAIM_CATEGORY,
	LINEITEM_TABLE1.CLAIM_CODE,
	CLAIM_CODE1.Description as CLAIM_DESCRIPTION,
	MASTER_TABLE1.ACC_NAME,
	MASTER_TABLE1.ACC_NO,
	MASTER_TABLE1.VENDOR_CODE,
	MASTER_TABLE1.GL_ACCOUNT,
	LINEITEM_TABLE1.POST_DATE,
	MASTER_TABLE1.CLAIM_REFERENCE,
key	LINEITEM_TABLE1.LINE_ITEM_REFERENCE_NUMBER,
	LINEITEM_TABLE1.ITEM_DESC,
	LINEITEM_TABLE1.INVOICE_NUMBER,
	LINEITEM_TABLE1.INVOICE_DATE,
	LINEITEM_TABLE1.CURRENCY,
	LINEITEM_TABLE1.POST_CURRENCY,
	LINEITEM_TABLE1.POST_CLAIM_AMOUNT,
	LINEITEM_TABLE1.ITEM_LINE_REMARKS_EMPLOYEE,
	MASTER_TABLE1.REMARKS_EMPLOYEE,
	MASTER_TABLE1.REMARKS_APPROVER1,
	MASTER_TABLE1.REMARKS_APPROVER2,
	MASTER_TABLE1.REMARKS_APPROVER3,
	MASTER_TABLE1.REMARKS_APPROVER4,
	MASTER_TABLE1.CLAIM_STATUS,
	MASTER_TABLE1.SUBMITTED_ON,
	MASTER_TABLE1.SUBMITTED_BY,
	MASTER_TABLE1.FIRST_LEVEL_APPROVER,
	MASTER_TABLE1.FIRST_LEVEL_APPROVED_ON,
	MASTER_TABLE1.SECOND_LEVEL_APPROVER,
	MASTER_TABLE1.SECOND_LEVEL_APPROVED_ON,
	MASTER_TABLE1.THIRD_LEVEL_APPROVER,
	MASTER_TABLE1.THIRD_LEVEL_APPROVED_ON,
	MASTER_TABLE1.FOURTH_LEVEL_APPROVER,
	MASTER_TABLE1.FOURTH_LEVEL_APPROVED_ON
}
union all select from CPC_LINEITEM_CLAIM as LINEITEM_TABLE2
inner join CPC_MASTER_CLAIM as MASTER_TABLE2
on MASTER_TABLE2.CLAIM_REFERENCE = LINEITEM_TABLE2.parent.CLAIM_REFERENCE AND MASTER_TABLE2.CLAIM_STATUS!='Pending for Submission'
left join sf.PerPersonal as PER_PERSON2
on PER_PERSON2.personIdExternal = MASTER_TABLE2.EMPLOYEE_ID
left join Claim_Code as CLAIM_CODE2
on CLAIM_CODE2.Claim_code = LINEITEM_TABLE2.CLAIM_CODE
{
key	MASTER_TABLE2.EMPLOYEE_ID, 
	PER_PERSON2.firstName as EMPLOYEE_FIRST_NAME,
	PER_PERSON2.lastName as EMPLOYEE_LAST_NAME,
	MASTER_TABLE2.CLAIM_CATEGORY,
	LINEITEM_TABLE2.CLAIM_CODE,
	CLAIM_CODE2.Description as CLAIM_DESCRIPTION,
	MASTER_TABLE2.ACC_NAME,
	MASTER_TABLE2.ACC_NO,
	MASTER_TABLE2.VENDOR_CODE,
	MASTER_TABLE2.GL_ACCOUNT,
	LINEITEM_TABLE2.POST_DATE,
	MASTER_TABLE2.CLAIM_REFERENCE,
key	LINEITEM_TABLE2.LINE_ITEM_REFERENCE_NUMBER,
	LINEITEM_TABLE2.ITEM_DESC,
	LINEITEM_TABLE2.INVOICE_NUMBER,
	LINEITEM_TABLE2.INVOICE_DATE,
	LINEITEM_TABLE2.CURRENCY,
	LINEITEM_TABLE2.POST_CURRENCY,
	LINEITEM_TABLE2.POST_CLAIM_AMOUNT,
	LINEITEM_TABLE2.ITEM_LINE_REMARKS_EMPLOYEE,
	MASTER_TABLE2.REMARKS_EMPLOYEE,
	MASTER_TABLE2.REMARKS_APPROVER1,
	MASTER_TABLE2.REMARKS_APPROVER2,
	MASTER_TABLE2.REMARKS_APPROVER3,
	MASTER_TABLE2.REMARKS_APPROVER4,
	MASTER_TABLE2.CLAIM_STATUS,
	MASTER_TABLE2.SUBMITTED_ON,
	MASTER_TABLE2.SUBMITTED_BY,
	MASTER_TABLE2.FIRST_LEVEL_APPROVER,
	MASTER_TABLE2.FIRST_LEVEL_APPROVED_ON,
	MASTER_TABLE2.SECOND_LEVEL_APPROVER,
	MASTER_TABLE2.SECOND_LEVEL_APPROVED_ON,
	MASTER_TABLE2.THIRD_LEVEL_APPROVER,
	MASTER_TABLE2.THIRD_LEVEL_APPROVED_ON,
	MASTER_TABLE2.FOURTH_LEVEL_APPROVER,
	MASTER_TABLE2.FOURTH_LEVEL_APPROVED_ON
}
union all select from OC_LINEITEM_CLAIM as LINEITEM_TABLE3
inner join OC_MASTER_CLAIM as MASTER_TABLE3
on MASTER_TABLE3.CLAIM_REFERENCE = LINEITEM_TABLE3.parent.CLAIM_REFERENCE AND MASTER_TABLE3.CLAIM_STATUS!='Pending for Submission'
left join sf.PerPersonal as PER_PERSON3
on PER_PERSON3.personIdExternal = MASTER_TABLE3.EMPLOYEE_ID
left join Claim_Code as CLAIM_CODE3
on CLAIM_CODE3.Claim_code = LINEITEM_TABLE3.CLAIM_CODE
{
key	MASTER_TABLE3.EMPLOYEE_ID, 
	PER_PERSON3.firstName as EMPLOYEE_FIRST_NAME,
	PER_PERSON3.lastName as EMPLOYEE_LAST_NAME,
	MASTER_TABLE3.CLAIM_CATEGORY,
	LINEITEM_TABLE3.CLAIM_CODE,
	CLAIM_CODE3.Description as CLAIM_DESCRIPTION,
	MASTER_TABLE3.ACC_NAME,
	MASTER_TABLE3.ACC_NO,
	MASTER_TABLE3.VENDOR_CODE,
	MASTER_TABLE3.GL_ACCOUNT,
	LINEITEM_TABLE3.POST_DATE,
	MASTER_TABLE3.CLAIM_REFERENCE,
key	LINEITEM_TABLE3.LINE_ITEM_REFERENCE_NUMBER,
	LINEITEM_TABLE3.ITEM_DESC,
	LINEITEM_TABLE3.INVOICE_NUMBER,
	LINEITEM_TABLE3.INVOICE_DATE,
	LINEITEM_TABLE3.CURRENCY,
	LINEITEM_TABLE3.POST_CURRENCY,
	LINEITEM_TABLE3.POST_CLAIM_AMOUNT,
	LINEITEM_TABLE3.ITEM_LINE_REMARKS_EMPLOYEE,
	MASTER_TABLE3.REMARKS_EMPLOYEE,
	MASTER_TABLE3.REMARKS_APPROVER1,
	MASTER_TABLE3.REMARKS_APPROVER2,
	MASTER_TABLE3.REMARKS_APPROVER3,
	MASTER_TABLE3.REMARKS_APPROVER4,
	MASTER_TABLE3.CLAIM_STATUS,
	MASTER_TABLE3.SUBMITTED_ON,
	MASTER_TABLE3.SUBMITTED_BY,
	MASTER_TABLE3.FIRST_LEVEL_APPROVER,
	MASTER_TABLE3.FIRST_LEVEL_APPROVED_ON,
	MASTER_TABLE3.SECOND_LEVEL_APPROVER,
	MASTER_TABLE3.SECOND_LEVEL_APPROVED_ON,
	MASTER_TABLE3.THIRD_LEVEL_APPROVER,
	MASTER_TABLE3.THIRD_LEVEL_APPROVED_ON,
	MASTER_TABLE3.FOURTH_LEVEL_APPROVER,
	MASTER_TABLE3.FOURTH_LEVEL_APPROVED_ON
}
union all select from SMS_PAY_UP_PAYMENT_REPORT {*};
}
