using {
    cuid,
    managed
} from '@sap/cds/common';

using {sf as sf} from '../db/sf-model';
using {benefit as be} from '../db/data-model';

// @cds.persistence.calcview
// @cds.persistence.exists 
// Entity ![EMPLOYEE_HR_CHECKER] {
// SPECIALISATION: String(100); 
// USERID_HR_MAKER: String(50); 
// CLAIM_CLAIM_CODE: String(50); 
// CLAIM_SEQUENCE_OF_CHECK: String(10); 
// }
context calculation{
  
@cds.persistence.calcview
@cds.persistence.exists 
entity EMP_MASTER_DETAILS (USER_ID:String(50)){
key     SEQNUMBER: String(100) ; 
key     STARTDATE: String ; 
key     USERID: String(100); 
		CUSTOMSTRING3: String(100); 
    	CUSTOMSTRING4: String(100)  ; 
    	PAYGRADE: String(100)  ; 
    	EMPLOYEECLASS: String(100) ; 
    	COMPANY: String(100) ; 
    	LOCATION: String(100) ; 
		MANAGERID: String(100)  ; 
		DEPARTMENT: String(100) ; 
		DIVISION: String(100); 
		EMPLOYEETYPE: String(100); 
		STANDARDHOURS: Decimal(10, 2); 
		PERSONIDEXTERNAL: String(100); 
		STARTDATE_1: String; 
		FIRSTNAME: String(100); 
		LASTNAME: String(100); 
		EMAILADDRESS: String(100); 
		ADMIN: String(50); 
		MANAGER: String(50);
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
		DIVISION_DESC:String(150);
		DEPARTMENT_DESC:String(150);
}

@cds.persistence.calcview
@cds.persistence.exists 
// entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_CODE_IN:String(50),ELIGIBILITY:String(50)){
entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_YEAR:String(13)){
key     EMPLOYEE: String(50); 
key     CLAIM_CODE_VALUE: String(50); 
		DESCRIPTION: String(50); 
		YEAR : String(13);
		YTD_OTHER: Decimal(10,2); 
    	YTD_CONSULT: Decimal(10,2); 
    	YTD_WARD_CHARGE: Decimal(10,2); 
    	YTD_HOSPITAL_FEE: Decimal(10,2); 
    	PENDING_AMOUNT: Decimal(10,2); 
    	TAKEN_AMOUNT: Decimal(10,2); 
    	BALANCE: Decimal(10,2); 
    	ENTITLEMENT: String(30); 
}


@cds.persistence.calcview
@cds.persistence.exists 
// entity GET_TAKEN_PENDING (USER_ID:String(50),CLAIM_CODE_IN:String(50),ELIGIBILITY:String(50)){
entity GET_TAKEN_PENDING_ALL (USER_ID:String(50), CLAIM_YEAR:String(13)){
key     EMPLOYEE: String(50); 
key     CLAIM_CODE_VALUE: String(50); 
		DESCRIPTION: String(50); 
		YEAR : String(13);
		YTD_OTHER: Decimal(10,2); 
    	YTD_CONSULT: Decimal(10,2); 
    	YTD_WARD_CHARGE: Decimal(10,2); 
    	YTD_HOSPITAL_FEE: Decimal(10,2); 
    	PENDING_AMOUNT: Decimal(10,2); 
    	TAKEN_AMOUNT: Decimal(10,2); 
    	BALANCE: Decimal(10,2); 
    	ENTITLEMENT: String(30); 
    	PAY_GRADE: String(100); 
		PERSONAL_AREA: String(100); 
		PERSONAL_SUB_AREA: String(100); 
		DEPARMENT: String(100); 
		DIVISION: String(100); 
}

entity excelUpload {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity uploadConfig {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity pay_up_config {

   key id:Integer;
   @Core.MediaType: mediaType
   content : LargeBinary ;
   @Core.IsMediaType: true
   mediaType : String;
   fileName : String;
   
}

entity PRORATED_CLAIMS_YTD {
	key	EMPLOYEE: String(50); 
    key	CLAIM_CODE_VALUE: String(50); 
	key	YEAR : String(13);
		DESCRIPTION: String(50); 
		YTD_OTHER: Decimal(10,2); 
    	YTD_CONSULT: Decimal(10,2); 
    	YTD_WARD_CHARGE: Decimal(10,2); 
    	YTD_HOSPITAL_FEE: Decimal(10,2); 
    	PENDING_AMOUNT: Decimal(10,2); 
    	TAKEN_AMOUNT: Decimal(10,2); 
    	BALANCE: Decimal(10,2); 
    	ENTITLEMENT: String(30); 
    	PAY_GRADE: String(100); 
		PERSONAL_AREA: String(100); 
		PERSONAL_SUB_AREA: String(100); 
		DEPARMENT: String(100); 
		DIVISION: String(100);
}

entity PRORATED_CLAIMS_YTD2 as
   	select from PRORATED_CLAIMS_YTD as prrCytd
   	left join sf.PerPersonal as prsnl 
   	on ( prrCytd.EMPLOYEE = prsnl.personIdExternal )
   	left join be.Benefit_Entitlement_Adjust as beEntAdj
   	on ( prrCytd.EMPLOYEE = beEntAdj.emp_Id AND
   		 prrCytd.YEAR = beEntAdj.Year AND
   		 prrCytd.CLAIM_CODE_VALUE = beEntAdj.Claim_code
   	   )
   	left join be.Claim_Department as beClmDep
   	on ( prrCytd.DEPARMENT = beClmDep.Department_Code AND prrCytd.PERSONAL_AREA = beClmDep.Company )
   	left join be.Claim_Division as beClmDiv
   	on ( prrCytd.DIVISION = beClmDiv.Division_Code AND prrCytd.PERSONAL_AREA = beClmDiv.Company )
   	{
		prrCytd.EMPLOYEE,
		prsnl.customString2 as NAME:String,
		prrCytd.CLAIM_CODE_VALUE,
		prrCytd.YEAR,
		prrCytd.DESCRIPTION,
		prrCytd.YTD_OTHER,
		prrCytd.YTD_CONSULT,
		prrCytd.YTD_WARD_CHARGE,
		prrCytd.YTD_HOSPITAL_FEE,
		prrCytd.PENDING_AMOUNT,
		prrCytd.TAKEN_AMOUNT,
		prrCytd.BALANCE,
		prrCytd.ENTITLEMENT,
    	CASE WHEN prrCytd.CLAIM_CODE_VALUE like '%_DAY' THEN 'Days'
			 ELSE 'SGD' END as UNIT:String,
		beEntAdj.Adjustment,
		prsnl.startDate,
		prsnl.endDate,
		'' as BE_REF_DATE:String,
		prrCytd.PAY_GRADE,
		prrCytd.PERSONAL_AREA,
		prrCytd.PERSONAL_SUB_AREA,
		prrCytd.DEPARMENT,
		beClmDep.Department_Desc,
		prrCytd.DIVISION,
		beClmDiv.Division_Desc
   	};
   	
define view Claim_Coordinator_ytd with parameters claim_Cordinator:String(20) as select from be.claim_coord_employee(claim_Cordinator: :claim_Cordinator) as claim_coord
inner join PRORATED_CLAIMS_YTD2 as YTD
ON YTD.EMPLOYEE = claim_coord.EmployeeID{
		YTD.EMPLOYEE,
		YTD.NAME,
		YTD.CLAIM_CODE_VALUE,
		YTD.YEAR,
		YTD.DESCRIPTION,
		YTD.YTD_OTHER,
		YTD.YTD_CONSULT,
		YTD.YTD_WARD_CHARGE,
		YTD.YTD_HOSPITAL_FEE,
		YTD.PENDING_AMOUNT,
		YTD.TAKEN_AMOUNT,
		YTD.BALANCE,
		YTD.ENTITLEMENT,
    	YTD.UNIT,
		YTD.Adjustment,
		YTD.startDate,
		YTD.endDate,
		YTD.BE_REF_DATE,
		YTD.PAY_GRADE,
		YTD.PERSONAL_AREA,
		YTD.PERSONAL_SUB_AREA,
		YTD.DEPARMENT,
		YTD.Department_Desc,
		YTD.DIVISION,
		YTD.Division_Desc
};

define view MEDISAVE_REPORT as select from MEDISAVE_REPORT_CAL_AMT as prorated
{
	prorated.CLAIM_CODE_VALUE,
	prorated.ENTITLEMENT,
	prorated.TAKEN_AMOUNT,
	prorated.PENDING_AMOUNT,
	prorated.YEAR,
	prorated.EMPLOYEE,
	prorated.BALANCE,
	prorated.MEDISAVE_CREDIT_CAP,
	CASE WHEN ( (CAST (prorated.BALANCE AS Decimal(10,2))) - (CAST (prorated.MEDISAVE_CREDIT_CAP AS Decimal(10,2))) ) < 0  then round(prorated.BALANCE)
	else round(prorated.MEDISAVE_CREDIT_CAP) end as MEDISAVE_CREDIT: Decimal(10,2),
	prorated.EMPLOYEE_NAME,
	prorated.DEPENDENT_ENTITLMENT
};
   	
define view MEDISAVE_REPORT_CAL_AMT as select from PRORATED_CLAIMS_YTD as prorated
inner join MEDISAVE_CLAIM_CODE as medclaimcode
on prorated.CLAIM_CODE_VALUE = medclaimcode.Claim_code
left join MEDISAVE_DEPEN_REPORT as meddep_report
on prorated.CLAIM_CODE_VALUE = meddep_report.Self_Claim_code
and prorated.EMPLOYEE = meddep_report.EMPLOYEE
AND prorated.YEAR = meddep_report.YEAR
inner join sf.PerPersonalView as empName
on empName.personIdExternal = prorated.EMPLOYEE
inner join sf.EmpJob as EmpJob
on prorated.EMPLOYEE = EmpJob.userId
and EmpJob.startDate <= $now
and EmpJob.endDate >= $now
{
	prorated.CLAIM_CODE_VALUE,
	prorated.ENTITLEMENT,
	prorated.TAKEN_AMOUNT,
	prorated.PENDING_AMOUNT,
	prorated.YEAR,
	prorated.EMPLOYEE,
	// prorated.BALANCE,
	CASE WHEN prorated.BALANCE is null THEN '0.00'
		 WHEN prorated.BALANCE < 0.00 THEN '0.00'
   		 ELSE prorated.BALANCE
		 END AS BALANCE : Decimal(10,2),
	CASE WHEN prorated.ENTITLEMENT is not null then
		(CAST (prorated.ENTITLEMENT AS Decimal(10,2)) * 50/100)
		else '0.00' end AS MEDISAVE_CREDIT_CAP : Decimal(10,2),
	empName.fullName as EMPLOYEE_NAME,
	meddep_report.ENTITLEMENT as DEPENDENT_ENTITLMENT
}
where EmpJob.company = 'MOHH';
   
define view MEDISAVE_DEPEN_REPORT as select from PRORATED_CLAIMS_YTD as prorated
inner join MEDISAVE_WITHDEPCLAIM_CODE as meddepclaimcode
on prorated.CLAIM_CODE_VALUE = meddepclaimcode.Claim_code{
	prorated.CLAIM_CODE_VALUE,
	prorated.ENTITLEMENT,
	prorated.TAKEN_AMOUNT,
	prorated.PENDING_AMOUNT,
	prorated.YEAR,
	prorated.EMPLOYEE,
	prorated.BALANCE,
	meddepclaimcode.Self_Claim_code
};
   
define view MEDISAVE_CLAIM_CODE as select from be.Company_Claim_Category as Category
left join MEDISAVE_DEPEND_CODE as dependents
ON Category.Claim_code = dependents.Dependent_Claim_Code
{
	Category.Claim_code
}
WHERE Category.Category_Code = 'MC' 
AND Category.Company = 'MOHH' 
AND dependents.Dependent_Claim_Code IS NULL
and Category.Claim_code not like '%_EFMR'
and Category.Claim_code <> 'VCMMR' and Category.Claim_code <> 'VCTDAP' ;

define view MEDISAVE_WITHDEPCLAIM_CODE as select from be.Company_Claim_Category as Category
left join MEDISAVE_DEPEND_CODE as dependents
ON Category.Claim_code = dependents.Dependent_Claim_Code
{
	Category.Claim_code,
	dependents.Claim_Code as Self_Claim_code
}
WHERE Category.Category_Code = 'MC' 
AND Category.Company = 'MOHH' 
AND dependents.Dependent_Claim_Code IS NOT NULL
and Category.Claim_code not like '%_EFMR'
and Category.Claim_code <> 'VCMMR' and Category.Claim_code <> 'VCTDAP' ;

define view MEDISAVE_DEPEND_CODE as select from be.Benefit_Claim_Admin
{
	Dependent_Claim_Code,
	Claim_Code
}
where Claim_Category = 'MC' and Dependent_Claim_Code is not null AND Company= 'MOHH'
and Start_Date <= $now and End_Date >= $now;
   
entity THREAD_JOB_INFO {

   key id:Integer;
   key process :String;
   key YEAR:String(13);
   key PAY_GRADE: String(100); 
   key PERSONAL_AREA: String(100); 
   key PERSONAL_SUB_AREA: String(100); 
   key DIVISION: String(100);
   job_end_time: DateTime;
   job_status:String(1);
}

entity upload_errlog {
   key id:String;
   error: String(1000);
   success: String;
}

entity YTD_EMPLOYEE_CLAIM_STATUS {
   key EMPLOYEE_ID:String;
   key YEAR: String(10);
   STATUS: String;
}

entity PAY_UP {
   key ID : String(256);
	   UPLOAD_REFERENCE_ID: String(50);
   key CLAIM_CODE:String(50);
   key SCHOLAR_ID:String(50);
       ITEM_DESC :String(256);
   key INVOICE_NUMBER:String(50);
	   //SCHOLAR_UNIV :String(150);
	   //SCHOLAR_DISC :String(150);
	   //SCHOLAR_SCHEME :String(150);
	   VENDOR_CODE:String(50);
	   INVOICE_DATE: Date; 
	   CURRENCY: String(10); 
	   CLAIM_AMOUNT: Decimal(10,2); 
	   ITEM_LINE_REMARKS_EMPLOYEE: String(500) @assert.format: '^(?![+=@-]).*'; //CSV INJECTION PREVENTION
}

entity EXPORT_REPORT_STATUS {
	key EXPORT_REPORT_ID: String(50);
		EMPLOYEE_ID: String(50);
		EMPLOYEE_NAME: String(100);
		FILE_GEN_TIMESTAMP: DateTime;
		FILE_NAME: String(50);
		REPORT_TYPE: String(20);
		STATUS: String(20);
	    FILE_BASE64 : LargeString;
}

}

@cds.persistence.calcview
@cds.persistence.exists
entity EMPLOYEE_HR_CHECKER (EMPLOYEE_ID:String(50),CLAIMCODE:String(13),HR_MAKER_LOGGED:String(13)) {
  key CLAIM_CLAIM_CODE : String(50);
  key CLAIM_SEQUENCE_OF_CHECK : String(10);
	USERID_HR_MAKER: String(50); 
	SPECIALISATION: String(100); 
  }
  
