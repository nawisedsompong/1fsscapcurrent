const cds = require('@sap/cds');
const dbClass = require("sap-hdbext-promisfied");
const hdbext = require("@sap/hdbext");
const rp = require('request-promise');
const xsenv = require('@sap/xsenv');
const Excel = require("exceljs");
var excelnode = require("node-xlsx");
// const gId = require('uuid');
// import { v4 as gId } from 'uuid';
const {
	v4: gId
} = require('uuid');
const {
	Readable,
	PassThrough
} = require('stream');

module.exports = async(srv) => {

	const db = await cds.connect.to("db");
	const {
		approval,
		approval_structure,
		Benefit_Claim_Admin,
		Claim_Admin,
		Claim_Category,
		Claim_Clinic,
		Claim_Code,
		Claim_Department,
		Claim_Division,
		Claim_Pa,
		Claim_Paycomponent,
		Claim_Pay_Grade,
		Claim_PSA,
		Claim_Specialisation,
		Claim_Sponsor,
		Claim_Status,
		Company_Claim_Category,
		Company_Master,
		Demo_Hana,
		overtime_claim,
		Benefit_Eligibility,
		Co_Payment,
		EMPLOYEE_MASTER,
		Medical_Claim,
		CPR_CLAIM,
		WRC_HR_LINEITEM_CLAIM,
		WRC_HR_MASTER_CLAIM,
		WRC_MASTER_CLAIM,
		WRC_LINEITEM_CLAIM,
		WRC_CLAIM_TYPE,
		Location_RO,
		masterandLocation,
		claimApproverView,
		Benefit_Transport_Amount,
		TC_MASTER_CLAIM,
		TC_LINEITEM_CLAIM,
		COV_MASTER_CLAIM,
		COV_LINEITEM_CLAIM,
		PC_CLAIM,
		PTF_ACL_BCL_CLAIM,
		SP_MASTER_CLAIM,
		SP_LINEITEM_CLAIM,
		SP1_MASTER_CLAIM,
		SP1_LINEITEM_CLAIM,
		SP2_MASTER_CLAIM,
		SP2_LINEITEM_CLAIM,
		SP3_MASTER_CLAIM,
		SP3_LINEITEM_CLAIM,
		SDFC_MASTER_CLAIM,
		SDFC_LINEITEM_CLAIM,
		SDFR_MASTER_CLAIM,
		SDFR_LINEITEM_CLAIM,
		CPC_MASTER_CLAIM,
		CPC_LINEITEM_CLAIM,
		OC_MASTER_CLAIM,
		OC_LINEITEM_CLAIM,
		PAY_UP_MASTER_CLAIM,
		PAY_UP_LINEITEM_CLAIM,
		AHP_LIC_MS_WIC_CLAIM,
		Benefit_Entitlement_Adjust,
		CLAIM_CANCEL_MASTER,
		BEN_LOCATION,
		VEHICLE_RATE,
		Medisave_Credit,
		CLAIM_COORDINATOR
	} = srv.entities('benefit');

	const {
		EmpJob,
		HolidayAssignment,
		EmpEmployment,
		EmpJobPartTime,
		EmployeeTime,
		v_FOLocation
	} = srv.entities('sf');

	const {
		EMP_MASTER_DETAILS,
		upload_errlog,
		PAY_UP,
		EXPORT_REPORT_STATUS
	} = srv.entities('calculation');

	// srv.on('userValidation', async(req) => {
	// 	let tx = cds.transaction(req),
	// 		filterObject;
	// 	if (req.data.USERID == "") {
	// 		filterObject = {
	// 			"EMAILADDRESS": req.user.id
	// 		}
	// 	} else {
	// 		filterObject = {
	// 			"USERID": req.data.USERID
	// 		}
	// 	}

	// 	var oEmployeeData = await tx.run(
	// 		SELECT.from(EMP_MASTER_DETAILS).where(filterObject));

	// 	return JSON.stringify(oEmployeeData);
	// });

	srv.on('getSDFClaimBalanceDetails', async(req) => {
		let userId = req.data.USER_ID;
		let entitlement = 0,
			takenAmount = 0,
			pendingSDFCAmount = 0,
			pendingSDFRAmount = 0,
			unutilizedAmount = 0,
			balance = 0;
		const tx = cds.transaction(req);
		if (!userId) {
			req.reject(400, 'Please provide value in "USER_ID" parameter.');
		}
		let entitlementResult = await tx.run(
			`
			SELECT "CUST_SDFCAP" AS "ENTITLEMENT" FROM "SF_SCHOLAR_SCHEME" WHERE "EXTERNALCODE"='${userId}'
		`);
		if (entitlementResult.length > 0 && entitlementResult[0].ENTITLEMENT) {
			entitlement = parseFloat(entitlementResult[0].ENTITLEMENT);
		}
		let approvedSDFCResult = await tx.run(
			`
			SELECT "LINEITEM"."POST_CLAIM_AMOUNT", "LINEITEM"."CLAIM_AMOUNT_SGD"
			FROM "BENEFIT_SDFC_LINEITEM_CLAIM" AS "LINEITEM"
			INNER JOIN "BENEFIT_SDFC_MASTER_CLAIM" AS "MASTER"
			ON "MASTER"."CLAIM_REFERENCE"="LINEITEM"."PARENT_CLAIM_REFERENCE" AND "MASTER"."CLAIM_STATUS"='Approved'
			WHERE "MASTER"."EMPLOYEE_ID"='${userId}'
		`
		);
		for (let i = 0; i < approvedSDFCResult.length; i++) {
			if (approvedSDFCResult[i].POST_CLAIM_AMOUNT) {
				takenAmount += parseFloat(approvedSDFCResult[i].POST_CLAIM_AMOUNT);
			} else if (approvedSDFCResult[i].CLAIM_AMOUNT_SGD) {
				takenAmount += parseFloat(approvedSDFCResult[i].CLAIM_AMOUNT_SGD);
			}
		}
		let pendingSDFCResult = await tx.run(
			`
			SELECT "LINEITEM"."POST_CLAIM_AMOUNT", "LINEITEM"."CLAIM_AMOUNT_SGD"
			FROM "BENEFIT_SDFC_LINEITEM_CLAIM" AS "LINEITEM"
			INNER JOIN "BENEFIT_SDFC_MASTER_CLAIM" AS "MASTER"
			ON "MASTER"."CLAIM_REFERENCE"="LINEITEM"."PARENT_CLAIM_REFERENCE" AND "MASTER"."CLAIM_STATUS" LIKE 'Pending for approval%'
			WHERE "MASTER"."EMPLOYEE_ID"='${userId}'
		`
		);
		for (let j = 0; j < pendingSDFCResult.length; j++) {
			if (pendingSDFCResult[j].POST_CLAIM_AMOUNT) {
				pendingSDFCAmount += parseFloat(pendingSDFCResult[j].POST_CLAIM_AMOUNT);
			} else if (pendingSDFCResult[j].CLAIM_AMOUNT_SGD) {
				pendingSDFCAmount += parseFloat(pendingSDFCResult[j].CLAIM_AMOUNT_SGD);
			}
		}
		let pendingSDFRResult = await tx.run(
			`
			SELECT "CLAIM_AMOUNT" FROM "BENEFIT_SDFR_MASTER_CLAIM"
			WHERE "EMPLOYEE_ID"='${userId}' AND "CLAIM_STATUS" LIKE 'Pending for approval%'
		`
		);
		for (let k = 0; k < pendingSDFRResult.length; k++) {
			if (pendingSDFRResult[k].CLAIM_AMOUNT) {
				pendingSDFRAmount += parseFloat(pendingSDFRResult[k].CLAIM_AMOUNT);
			}
		}
		let approvedSDFRResult = await tx.run(
			`
			SELECT "CLAIM_REFERENCE", "CLAIM_AMOUNT" FROM "BENEFIT_SDFR_MASTER_CLAIM" WHERE "EMPLOYEE_ID"='${userId}' AND "CLAIM_STATUS"='Approved'
		`
		);
		for (let m = 0; m < approvedSDFRResult.length; m++) {
			if (approvedSDFRResult[m].CLAIM_REFERENCE) {
				let sdfcDependentResult = await tx.run(
					`
					SELECT * 
					FROM "BENEFIT_SDFC_MASTER_CLAIM" 
					WHERE "EMPLOYEE_ID"='${userId}' AND "SDF_REFERENCE"='${approvedSDFRResult[m].CLAIM_REFERENCE}' AND 
						  ("CLAIM_STATUS"='Approved' OR
						  "CLAIM_STATUS" LIKE 'Pending for approval%' OR
						  "CLAIM_STATUS" LIKE 'Pending for Submission%')
				`
				);
				if (sdfcDependentResult.length === 0) {
					if (approvedSDFRResult[m].CLAIM_AMOUNT) {
						unutilizedAmount += parseFloat(approvedSDFRResult[m].CLAIM_AMOUNT);
					}
				}
			}
		}
		balance = entitlement - takenAmount - unutilizedAmount - pendingSDFCAmount - pendingSDFRAmount;
		return {
			ENTITLEMENT: parseFloat(entitlement).toFixed(2),
			UNUTILIZED_AMOUNT: parseFloat(unutilizedAmount).toFixed(2),
			PENDING_SDFR_AMOUNT: parseFloat(pendingSDFRAmount).toFixed(2),
			PENDING_SDFC_AMOUNT: parseFloat(pendingSDFCAmount).toFixed(2),
			TAKEN_AMOUNT: parseFloat(takenAmount).toFixed(2),
			BALANCE: parseFloat(balance).toFixed(2)
		};
	});

	srv.after('READ', 'getEmployeeDetails', async(req) => {
		// let tx = cds.transaction(req),
		// 	filterObject;
		// if (req.data.USERID == "") {
		// 	filterObject = {
		// 		"EMAILADDRESS": req.user.id
		// 	}
		// } else {
		// 	filterObject = {
		// 		"USERID": req.data.USERID
		// 	}
		// }

		// var oEmployeeData = await tx.run(
		// 	SELECT.from(getEmployeeDetails).where(filterObject));

		// return JSON.stringify(oEmployeeData);
	});

	function _appendLineQueryForExcel(req, table) {
		let employeeId = req.data.USERID;
		if (table == "BENEFIT_PAY_UP_LINEITEM_CLAIM") {
			if (employeeId != "") {
				if (Array.isArray(JSON.parse(employeeId))) {
					var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
					var sWHERELineItem =
						`AND "SCHOLAR_ID" IN ${removeArray}`;
				} else {
					var sWHERELineItem =
						`AND "SCHOLAR_ID" = '${employeeId}'`;

				}
			} else {
				var sWHERELineItem = ``;
			}
		} else {
			var sWHERELineItem = ``;
		}
		return sWHERELineItem;
	};

	function _appendQueryForExcelReport(req) {
		let employeeId = req.data.USERID;
		let hrAdmin = req.data.HR_ADMIN;
		let filterStartDate = req.data.fromDate;
		let filterEndDate = req.data.toDate;
		let claimCordin = req.data.CORDIN;
		let Personnel_Area = req.data.Personnel_Area;
		let Personal_Subarea = req.data.Personal_Subarea;
		let Pay_Grade = req.data.Pay_Grade;
		let Division = req.data.Division;
		let Year = req.data.Year;
		let CLAIM_STATUS = req.data.CLAIM_STATUS;
		let CLAIM_TYPE = req.data.CLAIM_TYPE;
		let CATEGORY_CODE = req.data.CATEGORY_CODE;
		let CLAIM_REFERENCE = req.data.CLAIM_REFERENCE;
		let CLAIM_CODE = req.data.CLAIM_CODE;
		var employeejob = ``;

		// var options = { hour12: false };
		// var current = new Date().toLocaleString('en-DE', options);
		// current = current.split(",")[0].split("/").reverse().join("-")+current.split(",")[1];
		var rep_status =
			` left join "SF_REPLICATION_LOGS" as  Replication_Logs
	on APP."CLAIM_REFERENCE" = Replication_Logs."INTERNAL_CLAIM_REFERENCE"`

		var claim_Refernce =
			` LEFT JOIN "BENEFIT_CANCELAFTERAPPROVEVIEW" as WITHCANCEL
							on WITHCANCEL."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;
		var approvalAppend =
			` LEFT JOIN "BENEFIT_APPROVAL" as BENEFITAPP
							on BENEFITAPP."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;

		var employeedetails = ` INNER JOIN "SF_PERPERSONALVIEW" as PERSONALVIEW
	on PERSONALVIEW."PERSONIDEXTERNAL" = APP."EMPLOYEE_ID"`;

		var current = new Date().toJSON().split("T")[0];

		// if (Personnel_Area != "" && Personal_Subarea != "" && hrAdmin != "") {
		// 	var Criterias_Employee_INNER =
		// 		`SELECT * FROM "BENEFIT_HR_ADMIN_EMPLOYEE" 
		// 	WHERE "HR_USER" ='${hrAdmin}' AND "PERSONNEL_AREA" ='${Personnel_Area}' AND "PERSONAL_SUBAREA"='${Personal_Subarea}'`;
		// 	if (Pay_Grade != "") {
		// 		Criterias_Employee_INNER = Criterias_Employee_INNER + `and "PAY_GRADE" = '${Pay_Grade}' `;
		// 	}
		// 	if (Division != "") {
		// 		Criterias_Employee_INNER = Criterias_Employee_INNER + `and "DIVISION" = '${Division}' `
		// 	}

		// 	var Criterias_Employee =
		// 		` INNER JOIN (SELECT DISTINCT WITHINCLUDE."USERID"
		// 	FROM (SELECT * FROM (${Criterias_Employee_INNER}) as HRADMIN  
		// 	LEFT JOIN "BENEFIT_INC_HRA_EMP" as INCLUDE
		// 	ON INCLUDE."ADMIN_HR_USER" = HRADMIN."HR_USER"
		// 	AND INCLUDE."ADMIN_SEQUENCE" = HRADMIN."SEQUENCE") as WITHINCLUDE
		// 	LEFT OUTER JOIN "BENEFIT_EXC_HRA_EMP" as EXCLUDE
		// 	ON EXCLUDE."ADMIN_HR_USER" = WITHINCLUDE."HR_USER"
		// 	AND EXCLUDE."ADMIN_SEQUENCE" = WITHINCLUDE."SEQUENCE"
		// 	AND WITHINCLUDE."USERID" = EXCLUDE."USERID") as HR_EMP
		// 	ON APP."EMPLOYEE_ID"= HR_EMP."USERID" `
		// } else {
		var Criterias_Employee = ``;
		// }

		// if (Personnel_Area != "" && Personal_Subarea != "") {
		// 	var Criterias_Employee =
		// 		` INNER JOIN "SF_EMPJOB" as empjob 
		// 	on  empjob."USERID" = APP."EMPLOYEE_ID"
		// 	and empjob."STARTDATE" <= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."ENDDATE" >= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."COMPANY" = '${Personnel_Area}' and empjob."LOCATION" = '${Personal_Subarea}' `;
		// 	if (Pay_Grade != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."PAYGRADE" = '${Pay_Grade}' `;
		// 	}
		// 	if (Division != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."DIVISION" = '${Division}' `
		// 	}
		// } else {
		// 	var Criterias_Employee = ``;
		// }

		if (claimCordin != "") {
			var CLAIMJOIN =
				` INNER JOIN BENEFIT_CLAIM_COORD_EMPLOYEE(claim_Cordinator => '${claimCordin}') as coordinate
						  ON APP.EMPLOYEE_ID = coordinate.EMPLOYEEID and coordinate.REPORT ='Yes'
				INNER JOIN "SF_EMPEMPLOYMENT" AS "EMPEMPLOY" ON "EMPEMPLOY"."PERSONIDEXTERNAL" = APP."EMPLOYEE_ID"
			AND EMPEMPLOY."STARTDATE" <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
			and (EMPEMPLOY."ENDDATE" >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') or  EMPEMPLOY."ENDDATE" is null)`;
		} else {
			var CLAIMJOIN = ' ';
		}

		if (employeeId == "" && filterStartDate == "" && filterEndDate == "") {
			var sWHERE = `WHERE APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId != "" && filterStartDate == "" && filterEndDate == "") {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE = `WHERE APP."EMPLOYEE_ID" IN ${removeArray}`;
			} else {
				var sWHERE = `WHERE APP."EMPLOYEE_ID" = '${employeeId}'`;
			}

			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId == "" && filterStartDate != "" && filterEndDate != "") {
			var sWHERE = `WHERE APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;

			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE =
					`WHERE APP."EMPLOYEE_ID" IN ${removeArray} AND APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;
			} else {
				var sWHERE =
					`WHERE APP."EMPLOYEE_ID" = '${employeeId}' AND APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;

			}
			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		}

		var otherFilter = [];
		if (CATEGORY_CODE != "") {
			otherFilter.push(`APP.CATEGORY_CODE = '${CATEGORY_CODE}'`)
		}
		if (CLAIM_STATUS != "") {
			otherFilter.push(`APP.CLAIM_STATUS = '${CLAIM_STATUS}'`)
		}
		if (CLAIM_TYPE != "") {
			otherFilter.push(`BENEFITAPP.CLAIM_TYPE = '${CLAIM_TYPE}'`)
		}
		if (CLAIM_REFERENCE != "") {
			otherFilter.push(`APP.CLAIM_REFERENCE = '${CLAIM_REFERENCE}'`)
		}
		if (CLAIM_CODE != "") {
			otherFilter.push(`APP.CLAIM_CODE = '${CLAIM_CODE}'`)
		}
		if (Personal_Subarea != "") {
			employeejob = ` INNER JOIN "SF_EMPJOB" as EMPJOB
	on EMPJOB."USERID" = APP."EMPLOYEE_ID"`;

			otherFilter.push(
				`EMPJOB."LOCATION" = '${Personal_Subarea}' AND EMPJOB."STARTDATE" <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
	and EMPJOB."ENDDATE" >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')`
			)
		}
		for (index in otherFilter) {
			if (index == 0) {
				if (sWHERE == ``) {
					sWHERE += `WHERE ` + otherFilter[index];
				} else {
					sWHERE += ` AND ` + otherFilter[index];
				}

			} else {
				sWHERE += ` AND ` + otherFilter[index];
			}

		}

		//REP LOGS STATUS
		if (sWHERE == ``) {
			sWHERE += `WHERE (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		} else {
			sWHERE += ` AND (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		}

		var sAPPENDQUERY = rep_status + claim_Refernce + approvalAppend + employeedetails + employeejob + Criterias_Employee + CLAIMJOIN +
			sWHERE;
		console.log(sAPPENDQUERY);
		// var sAPPENDQUERY = CLAIMJOIN + sWHERE;
		return sAPPENDQUERY;
	};

	function _appendQueryForExcelPAYUP(req) {
		let employeeId = req.data.USERID;
		let hrAdmin = req.data.HR_ADMIN;
		let filterStartDate = req.data.fromDate;
		let filterEndDate = req.data.toDate;
		let claimCordin = req.data.CORDIN;
		let Personnel_Area = req.data.Personnel_Area;
		let Personal_Subarea = req.data.Personal_Subarea;
		let Pay_Grade = req.data.Pay_Grade;
		let Division = req.data.Division;
		let Year = req.data.Year;
		let CLAIM_STATUS = req.data.CLAIM_STATUS;
		let CLAIM_TYPE = req.data.CLAIM_TYPE;
		let CATEGORY_CODE = req.data.CATEGORY_CODE;
		let CLAIM_REFERENCE = req.data.CLAIM_REFERENCE;
		let CLAIM_CODE = req.data.CLAIM_CODE;
		// var options = { hour12: false };
		// var current = new Date().toLocaleString('en-DE', options);
		// current = current.split(",")[0].split("/").reverse().join("-")+current.split(",")[1];
		var rep_status =` left join "SF_REPLICATION_LOGS" as  Replication_Logs
			on APP."CLAIM_REFERENCE" = Replication_Logs."INTERNAL_CLAIM_REFERENCE"`;
			
		var payup = ` INNER JOIN "BENEFIT_PAY_UP_LINEITEM_CLAIM" as LINEPAY
					ON LINEPAY."PARENT_CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`
		var claim_Refernce =
			` LEFT JOIN "BENEFIT_CANCELAFTERAPPROVEVIEW" as WITHCANCEL
							on WITHCANCEL."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;

		var approvalAppend =
			` LEFT JOIN "BENEFIT_APPROVAL" as BENEFITAPP
							on BENEFITAPP."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;

		var employeedetails = ` INNER JOIN "SF_PERPERSONALVIEW" as PERSONALVIEW
	on PERSONALVIEW."PERSONIDEXTERNAL" = APP."EMPLOYEE_ID"`;

		var current = new Date().toJSON().split("T")[0];

		// if (Personnel_Area != "" && Personal_Subarea != "" && hrAdmin != "") {
		// 	var Criterias_Employee_INNER =
		// 		`SELECT * FROM "BENEFIT_HR_ADMIN_EMPLOYEE" 
		// 	WHERE "HR_USER" ='${hrAdmin}' AND "PERSONNEL_AREA" ='${Personnel_Area}' AND "PERSONAL_SUBAREA"='${Personal_Subarea}'`;
		// 	if (Pay_Grade != "") {
		// 		Criterias_Employee_INNER = Criterias_Employee_INNER + `and "PAY_GRADE" = '${Pay_Grade}' `;
		// 	}
		// 	if (Division != "") {
		// 		Criterias_Employee_INNER = Criterias_Employee_INNER + `and "DIVISION" = '${Division}' `
		// 	}

		// 	var Criterias_Employee =
		// 		` INNER JOIN (SELECT DISTINCT WITHINCLUDE."USERID"
		// 	FROM (SELECT * FROM (${Criterias_Employee_INNER}) as HRADMIN  
		// 	LEFT JOIN "BENEFIT_INC_HRA_EMP" as INCLUDE
		// 	ON INCLUDE."ADMIN_HR_USER" = HRADMIN."HR_USER"
		// 	AND INCLUDE."ADMIN_SEQUENCE" = HRADMIN."SEQUENCE") as WITHINCLUDE
		// 	LEFT OUTER JOIN "BENEFIT_EXC_HRA_EMP" as EXCLUDE
		// 	ON EXCLUDE."ADMIN_HR_USER" = WITHINCLUDE."HR_USER"
		// 	AND EXCLUDE."ADMIN_SEQUENCE" = WITHINCLUDE."SEQUENCE"
		// 	AND WITHINCLUDE."USERID" = EXCLUDE."USERID") as HR_EMP
		// 	ON LINEPAY."SCHOLAR_ID"= HR_EMP."USERID" `
		// } else {
		var Criterias_Employee = ``;
		// }

		// if (Personnel_Area != "" && Personal_Subarea != "") {
		// 	var Criterias_Employee =
		// 		` INNER JOIN "SF_EMPJOB" as empjob 
		// 	on  empjob."USERID" = APP."EMPLOYEE_ID"
		// 	and empjob."STARTDATE" <= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."ENDDATE" >= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."COMPANY" = '${Personnel_Area}' and empjob."LOCATION" = '${Personal_Subarea}' `;
		// 	if (Pay_Grade != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."PAYGRADE" = '${Pay_Grade}' `;
		// 	}
		// 	if (Division != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."DIVISION" = '${Division}' `
		// 	}
		// } else {
		// 	var Criterias_Employee = ``;
		// }

		if (claimCordin != "") {
			var CLAIMJOIN =
				` INNER JOIN BENEFIT_CLAIM_COORD_EMPLOYEE(claim_Cordinator => '${claimCordin}') as coordinate
			ON LINEPAY."SCHOLAR_ID" = coordinate.EMPLOYEEID and coordinate.REPORT ='Yes'INNER JOIN "SF_EMPEMPLOYMENT" AS "EMPEMPLOY" ON "EMPEMPLOY"."PERSONIDEXTERNAL" = LINEPAY."SCHOLAR_ID" 
			AND EMPEMPLOY."STARTDATE" <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')
			and (EMPEMPLOY."ENDDATE" >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') or  EMPEMPLOY."ENDDATE" is null)`;
		} else {
			var CLAIMJOIN = ' ';
		}

		if (employeeId == "" && filterStartDate == "" && filterEndDate == "") {
			var sWHERE = `WHERE APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId != "" && filterStartDate == "" && filterEndDate == "") {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE = `WHERE LINEPAY."SCHOLAR_ID" IN ${removeArray}`;
			} else {
				var sWHERE = `WHERE LINEPAY."SCHOLAR_ID" = '${employeeId}'`;
			}

			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId == "" && filterStartDate != "" && filterEndDate != "") {
			var sWHERE = `WHERE APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;

			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		} else {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE =
					`WHERE LINEPAY."SCHOLAR_ID" IN ${removeArray} AND APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;
			} else {
				var sWHERE =
					`WHERE LINEPAY."SCHOLAR_ID" = '${employeeId}' AND APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;

			}
			sWHERE = sWHERE + ` and APP."CLAIM_STATUS" <> 'Pending for Submission'`;
		}

		var otherFilter = [];
		if (CATEGORY_CODE != "") {
			otherFilter.push(`APP.CATEGORY_CODE = '${CATEGORY_CODE}'`)
		}
		if (CLAIM_STATUS != "") {
			otherFilter.push(`APP."CLAIM_STATUS" = '${CLAIM_STATUS}'`)
		}
		if (CLAIM_TYPE != "") {
			otherFilter.push(`BENEFITAPP."CLAIM_TYPE" = '${CLAIM_TYPE}'`)
		}
		if (CLAIM_REFERENCE != "") {
			otherFilter.push(`APP."CLAIM_REFERENCE" = '${CLAIM_REFERENCE}'`)
		}
		// if (CLAIM_CODE != "") {
		// 	otherFilter.push(`APP.CLAIM_CODE = '${CLAIM_CODE}'`)
		// }
		for (index in otherFilter) {
			if (index == 0) {
				if (sWHERE == ``) {
					sWHERE += `WHERE ` + otherFilter[index];
				} else {
					sWHERE += ` AND ` + otherFilter[index];
				}

			} else {
				sWHERE += ` AND ` + otherFilter[index];
			}

		}
		
			//REP LOGS STATUS
		if (sWHERE == ``) {
			sWHERE += `WHERE (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		} else {
			sWHERE += ` AND (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		}

		var sAPPENDQUERY = rep_status+payup + claim_Refernce + approvalAppend + employeedetails + Criterias_Employee + CLAIMJOIN + sWHERE;
		console.log(sAPPENDQUERY);
		// var sAPPENDQUERY = CLAIMJOIN + sWHERE;
		return sAPPENDQUERY;
	};

	function removeClaimcodefromWhere(string) {
		if (string.match(/(?<=AND APP.CLAIM_CODE = \s*).*?(?=\s*AND)/gs) != null) {
			var claim_code = string.match(/(?<=AND APP.CLAIM_CODE = \s*).*?(?=\s*AND)/gs)[0];
			var strChanged = string.replace(`AND APP.CLAIM_CODE = ` + claim_code, "");
		} else {
			var strChanged = string;
		}
		return strChanged;
	};

	srv.on('exportYtdReport', async(req, next) => {
		cds.spawn({
			after: 100
		}, async() => {
				let tx = db.tx();
			let userEmail = req.user.id;
			let loggedInEmpID = '';
			let loggedInEmpName = '';
			await tx.begin();
			let userResult = await tx.run(
				`SELECT 
					"PER_EMAIL"."PERSONIDEXTERNAL",
					"PER_PERSON"."CUSTOMSTRING2" AS "EMPLOYEE_NAME"
				FROM "SF_PEREMAIL" AS "PER_EMAIL"
				LEFT JOIN "SF_PERPERSONAL" AS "PER_PERSON"
				ON "PER_EMAIL"."PERSONIDEXTERNAL"="PER_PERSON"."PERSONIDEXTERNAL"
				WHERE "EMAILADDRESS"='${userEmail}'`
			);
			if (userResult.length > 0 && userResult[0].PERSONIDEXTERNAL) {
				loggedInEmpID = userResult[0].PERSONIDEXTERNAL;
				loggedInEmpName = userResult[0].EMPLOYEE_NAME;
			}
			let tx2 = db.tx();
			await tx2.begin();
			await tx2.run(
				`DELETE FROM "CALCULATION_EXPORT_REPORT_STATUS" WHERE "REPORT_TYPE"='CLAIM_REPORT' AND "EMPLOYEE_ID"='${loggedInEmpID}'`);
			let exportReportID = new Date().getTime().toString();
			let reportType = 'CLAIM_REPORT';
			let convertedCurrentDate = convertTimeZone(new Date(), 'Asia/Singapore');
			let currentTimestamp = dateTimeFormat(convertedCurrentDate);
			let fileName = reportType + '_' + currentTimestamp;
			await tx2.run(INSERT.into(EXPORT_REPORT_STATUS).entries({
				EXPORT_REPORT_ID: exportReportID,
				EMPLOYEE_ID: loggedInEmpID,
				EMPLOYEE_NAME: loggedInEmpName,
				FILE_GEN_TIMESTAMP: currentTimestamp,
				FILE_NAME: fileName,
				REPORT_TYPE: reportType,
				STATUS: 'Pending'
			}));
			await tx2.commit();

		
				var worksheetColoumn = [],
				worksheetarray = [],
				worksheetColoumnItem = [], //new ItemWorksheet
				worksheetarrayItem = []
				countClaim = 0; //new ItemWorksheet

			const workbook = new Excel.Workbook();
			let YTDresultCount = await tx.run(
				`SELECT count(*) FROM "CALCULATION_PRORATED_CLAIMS_YTD2" AS "PRORATED" WHERE "YEAR"='2022'`);
				
				let YTDresult =[],OFFSET=0;
				
				for(var index=10000 ;index < YTDresultCount[0]['COUNT(*)'];index+=10000){
					var temp = await tx.run(
						`SELECT * FROM (SELECT * FROM "CALCULATION_PRORATED_CLAIMS_YTD2" 
						WHERE "YEAR"='2022' ORDER BY "EMPLOYEE") ROWS limit 10000 offset ${OFFSET} `);
					YTDresult = YTDresult.concat(temp);
					OFFSET = index;
				}
		

			//------------Creating the Excel Coloumn using the Table Key fields
			if (YTDresult.length != 0) {
				Object.keys(YTDresult[0]).forEach(key => {
					worksheetColoumn.push({
						header: key,
						key: key
					})
				})
				worksheetarray[countClaim] = workbook.addWorksheet('YTD Report');
				worksheetarray[countClaim].properties.outlineProperties = {
					summaryBelow: false,
					summaryRight: false,
				};
				worksheetarray[countClaim].columns = worksheetColoumn;
				worksheetarray[countClaim].addRows(YTDresult);
			}
			const ConvertToBase64 = async() => {
					const fs = require("fs");
					const buffer = await workbook.xlsx.writeBuffer();
					return Buffer.from(buffer).toString("base64");
				};
				let rt = await ConvertToBase64();
				
				// return rt;
				await tx.run(
					`UPDATE "CALCULATION_EXPORT_REPORT_STATUS" SET "FILE_BASE64"='${rt}', "STATUS"='Completed', "MESSAGE"='Report Generated Successfully.' WHERE "EXPORT_REPORT_ID"='${exportReportID}' AND "EMPLOYEE_ID"='${loggedInEmpID}'`
				);
				await tx.commit();
		});
	});
	srv.on('exportExcelClaim', async(req, next) => {
		cds.spawn({
			after: 100
		}, async() => {
			let tx = db.tx();
			let userEmail = req.user.id;
			let employeeId = req.data.USERID;
			let filterStartDate = req.data.fromDate;
			let filterEndDate = req.data.toDate;
			let claimCordin = req.data.CORDIN;
			let Personnel_Area = req.data.Personnel_Area == 'MOHHSCH' ? req.data.Personnel_Area : 'MOHH/MOHT';
			let loggedInEmpID = '';
			let loggedInEmpName = '';
			await tx.begin();
			let userResult = await tx.run(
				`SELECT 
					"PER_EMAIL"."PERSONIDEXTERNAL",
					"PER_PERSON"."CUSTOMSTRING2" AS "EMPLOYEE_NAME"
				FROM "SF_PEREMAIL" AS "PER_EMAIL"
				LEFT JOIN "SF_PERPERSONAL" AS "PER_PERSON"
				ON "PER_EMAIL"."PERSONIDEXTERNAL"="PER_PERSON"."PERSONIDEXTERNAL"
				WHERE "EMAILADDRESS"='${userEmail}'`
			);
			if (userResult.length > 0 && userResult[0].PERSONIDEXTERNAL) {
				loggedInEmpID = userResult[0].PERSONIDEXTERNAL;
				loggedInEmpName = userResult[0].EMPLOYEE_NAME;
			}
			let tx2 = db.tx();
			await tx2.begin();
			await tx2.run(
				`DELETE FROM "CALCULATION_EXPORT_REPORT_STATUS" WHERE "REPORT_TYPE"='CLAIM_REPORT' AND "EMPLOYEE_ID"='${loggedInEmpID}'`);
			let exportReportID = new Date().getTime().toString();
			let reportType = 'CLAIM_REPORT';
			let convertedCurrentDate = convertTimeZone(new Date(), 'Asia/Singapore');
			let currentTimestamp = dateTimeFormat(convertedCurrentDate);
			let fileName = reportType + '_' + currentTimestamp;
			await tx2.run(INSERT.into(EXPORT_REPORT_STATUS).entries({
				EXPORT_REPORT_ID: exportReportID,
				EMPLOYEE_ID: loggedInEmpID,
				EMPLOYEE_NAME: loggedInEmpName,
				FILE_GEN_TIMESTAMP: currentTimestamp,
				FILE_NAME: fileName,
				REPORT_TYPE: reportType,
				STATUS: 'Pending'
			}));
			await tx2.commit();
			//------Set filter for report
			var sAPPENDQUERY = _appendQueryForExcelReport(req);

			var claim_array = [{
				table: "BENEFIT_MEDICAL_CLAIM",
				label: "Medical Claim",
				company: "MOHH/MOHT"
			}, {
				table: "BENEFIT_OVERTIME_CLAIM",
				label: "Timesheet",
				company: "MOHH/MOHT"
			}, {
				table: "BENEFIT_PC_CLAIM",
				label: "Petty Cash",
				company: "MOHH/MOHT"
			}, {
				table: "BENEFIT_CPR_CLAIM",
				label: "Clinical Placement Request",
				company: "MOHHSCH"
			}];

			var claim_multi_claim = [{
				table: "BENEFIT_PTF_ACL_BCL_CLAIM",
				multi_items_Label: [{
					category: "PTF",
					label: "Personal Training Fund"
				}, {
					category: "CLS",
					label: "ACLS_BCLS"
				}],
				company: "MOHH/MOHT"
			}, {
				table: "BENEFIT_AHP_LIC_MS_WIC_CLAIM",
				multi_items_Label: [{
					category: "AHP",
					label: "AHP Reimbursement"
				}, {
					category: "LIC",
					label: "License Reimbursement"
				}, {
					category: "MSR",
					label: "Medical Staff Reimbursement"
				}, {
					category: "WIC",
					label: "Work Injury Compensation"
				}],
				company: "MOHH/MOHT"
			}];

			var claim_master_array = [{
					master: "BENEFIT_WRC_MASTER_CLAIM",
					lineItem: "BENEFIT_WRC_LINEITEM_CLAIM",
					label: "Work Related Claim",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_WRC_HR_MASTER_CLAIM",
					lineItem: "BENEFIT_WRC_HR_LINEITEM_CLAIM",
					label: "Work Related Claim HR",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_COV_MASTER_CLAIM",
					lineItem: "BENEFIT_COV_LINEITEM_CLAIM",
					label: "COVID-19",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_SP_MASTER_CLAIM",
					lineItem: "BENEFIT_SP_LINEITEM_CLAIM",
					label: "Sponsorship Exit Exam",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_SP1_MASTER_CLAIM",
					lineItem: "BENEFIT_SP1_LINEITEM_CLAIM",
					label: "Sponsorship Int Conf",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_SP2_MASTER_CLAIM",
					lineItem: "BENEFIT_SP2_LINEITEM_CLAIM",
					label: "Sponsorship Reg Conf",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_SP3_MASTER_CLAIM",
					lineItem: "BENEFIT_SP3_LINEITEM_CLAIM",
					label: "Sponsorship Residents",
					company: "MOHH/MOHT"
				}, {
					master: "BENEFIT_SDFC_MASTER_CLAIM",
					lineItem: "BENEFIT_SDFC_LINEITEM_CLAIM",
					label: "SDF Claims",
					company: "MOHHSCH"
				}, {
					master: "BENEFIT_SDFR_MASTER_CLAIM",
					lineItem: "BENEFIT_SDFR_LINEITEM_CLAIM",
					label: "SDF Request",
					company: "MOHHSCH"
				}, {
					master: "BENEFIT_CPC_MASTER_CLAIM",
					lineItem: "BENEFIT_CPC_LINEITEM_CLAIM",
					label: "Placement Claim",
					company: "MOHHSCH"
				}, {
					master: "BENEFIT_OC_MASTER_CLAIM",
					lineItem: "BENEFIT_OC_LINEITEM_CLAIM",
					label: "Other Claims",
					company: "MOHHSCH"
				}, {
					master: "BENEFIT_PAY_UP_MASTER_CLAIM",
					lineItem: "BENEFIT_PAY_UP_LINEITEM_CLAIM",
					label: "Payment Upload",
					company: "MOHHSCH"
				}, {
					master: "BENEFIT_TC_MASTER_CLAIM",
					lineItem: "BENEFIT_TC_LINEITEM_CLAIM",
					label: "Transport Claim",
					company: "MOHH/MOHT"
				}]
				// Removed adding Master and LineItem in same Sheet comment the code if need the feature

			var worksheetColoumn = [],
				worksheetarray = [],
				worksheetColoumnItem = [], //new ItemWorksheet
				worksheetarrayItem = []; //new ItemWorksheet

			const workbook = new Excel.Workbook();

			//-------------- Claims without lineitems retrieval------------------------
			for (let claimIndex in claim_array) {
				if (Personnel_Area == claim_array[claimIndex].company) {
					worksheetColoumn = [];
					var claimList = await tx.run(
						`SELECT DISTINCT APP.*, WITHCANCEL.cancelreference,PERSONALVIEW."FULLNAME",Replication_Logs."CLAIM_REF_NUMBER" FROM "${claim_array[claimIndex].table}" as APP` +
						sAPPENDQUERY);

					//------------Creating the Excel Coloumn using the Table Key fields
					if (claimList.length != 0) {
						Object.keys(claimList[0]).forEach(key => {
							worksheetColoumn.push({
								header: key,
								key: key
							})
						})

						worksheetarray[claimIndex] = workbook.addWorksheet(claim_array[claimIndex].label);
						worksheetarray[claimIndex].properties.outlineProperties = {
							summaryBelow: false,
							summaryRight: false,
						};
						worksheetarray[claimIndex].columns = worksheetColoumn;
						worksheetarray[claimIndex].addRows(claimList);
					}
				}
			}

			//-------------- Claims without lineitems and combined Table retrieval------------------------
			for (let claimIndexMult in claim_multi_claim) {
				if (Personnel_Area == claim_multi_claim[claimIndexMult].company) {
					worksheetColoumn = [];
					var claimListMul = await tx.run(
						`SELECT DISTINCT APP.*, WITHCANCEL.cancelreference,PERSONALVIEW."FULLNAME",Replication_Logs."CLAIM_REF_NUMBER" FROM "${claim_multi_claim[claimIndexMult].table}" as APP` +
						sAPPENDQUERY);

					//------------Creating the Excel Coloumn using the Table Key fields
					if (claimListMul.length != 0) {
						Object.keys(claimListMul[0]).forEach(key => {
							worksheetColoumn.push({
								header: key,
								key: key
							})
						})

						for (let countClaim in claim_multi_claim[claimIndexMult].multi_items_Label) {
							var listofCategoryFiltered = claimListMul.filter(checkMultiCategory)

							function checkMultiCategory(rows) {
								return rows.CATEGORY_CODE == claim_multi_claim[claimIndexMult].multi_items_Label[countClaim].category;
							}
							if (listofCategoryFiltered.length != 0) {
								worksheetarray[countClaim] = workbook.addWorksheet(claim_multi_claim[claimIndexMult].multi_items_Label[countClaim].label);
								worksheetarray[countClaim].properties.outlineProperties = {
									summaryBelow: false,
									summaryRight: false,
								};
								worksheetarray[countClaim].columns = worksheetColoumn;
								worksheetarray[countClaim].addRows(listofCategoryFiltered);
							}
						}
					}
				}
			}

			//--------------Master Line items Claims retrieval------------------------
			for (let claimIndexM in claim_master_array) {
				if (Personnel_Area == claim_master_array[claimIndexM].company) {
					worksheetColoumn = [];
					worksheetColoumnItem = []; //new ItemWorksheet

					if (claim_master_array[claimIndexM].master == "BENEFIT_PAY_UP_MASTER_CLAIM") {
						var sAPPENDQUERYITEM = _appendQueryForExcelPAYUP(req);
					} else {
						var sAPPENDQUERYITEM = removeClaimcodefromWhere(sAPPENDQUERY);
					}
					var claimListM = await tx.run(
						`SELECT DISTINCT APP.*, WITHCANCEL.cancelreference,PERSONALVIEW."FULLNAME",Replication_Logs."CLAIM_REF_NUMBER" FROM "${claim_master_array[claimIndexM].master}" as APP` +
						sAPPENDQUERYITEM);
					var claimListI = await tx.run(`SELECT TOP 1 * FROM "${claim_master_array[claimIndexM].lineItem}"`);

					//------------Creating the Excel Coloumn using the Master Table Key fields
					if (claimListM.length != 0) {
						Object.keys(claimListM[0]).forEach(key => {
							worksheetColoumn.push({
								header: key,
								key: key
							})
						});

						//------------Creating the Excel Coloumn using the LineItem Table Key fields
						Object.keys(claimListI[0]).forEach(key => {
							var isKeyAvailable = worksheetColoumn.filter(checkColumn)

							function checkColumn(coloumn) {
								return coloumn.key == key;
							}
							if (isKeyAvailable.length == 0) {
								//new ItemWorksheet

								worksheetColoumnItem.push({
									header: key,
									key: key
								})

								//End new ItemWorksheet
							}
						})

						worksheetarray[claimIndexM] = workbook.addWorksheet(claim_master_array[claimIndexM].label);
						worksheetarray[claimIndexM].properties.outlineProperties = {
							summaryBelow: false,
							summaryRight: false,
						};
						worksheetarray[claimIndexM].columns = worksheetColoumn;

						//new ItemWorksheet

						worksheetarrayItem[claimIndexM] = workbook.addWorksheet(claim_master_array[claimIndexM].label + " LineItem");
						worksheetarrayItem[claimIndexM].properties.outlineProperties = {
							summaryBelow: false,
							summaryRight: false,
						};
						worksheetarrayItem[claimIndexM].columns = worksheetColoumnItem;

						//End new ItemWorksheet

						//------Arrage the Rows along with respective LineiTems
						var MasterLineiTemArray = []
						for (let MasterIndex in claimListM) {
							//----Add Master To rows---------
							worksheetarray[claimIndexM].addRow(claimListM[MasterIndex]);
							//for PAY_UP the extra Logic 
							var table = claim_master_array[claimIndexM].lineItem;
							var sWHERELineItem = _appendLineQueryForExcel(req, table);
							//end for PAY_UP the extra Logic 
							var LineItemMaster = await tx.run(
								`SELECT * FROM "${claim_master_array[claimIndexM].lineItem}" 
													   WHERE "PARENT_CLAIM_REFERENCE"= '${claimListM[MasterIndex].CLAIM_REFERENCE}' ` +
								sWHERELineItem
							);
							for (let lineItemIndex in LineItemMaster) {
								//new ItemWorksheet
								var newRow = worksheetarrayItem[claimIndexM].addRow(LineItemMaster[lineItemIndex]);
								//End new ItemWorksheet
							}
						}
					}
				}
			}
			if (workbook.worksheets.length != 0) {
				const ConvertToBase64 = async() => {
					const fs = require("fs");
					const buffer = await workbook.xlsx.writeBuffer();
					return Buffer.from(buffer).toString("base64");
				};
				let rt = await ConvertToBase64();
				await tx.run(
					`UPDATE "CALCULATION_EXPORT_REPORT_STATUS" SET "FILE_BASE64"='${rt}', "STATUS"='Completed', "MESSAGE"='Report Generated Successfully.' WHERE "EXPORT_REPORT_ID"='${exportReportID}' AND "EMPLOYEE_ID"='${loggedInEmpID}'`
				);
				await tx.commit();
				return console.log('Report Generated Successfully.');
			} else {
				await tx.run(
					`UPDATE "CALCULATION_EXPORT_REPORT_STATUS" SET "STATUS"='Error', "MESSAGE"='There are no data to export for the selected criteria.' WHERE "EXPORT_REPORT_ID"='${exportReportID}' AND "EMPLOYEE_ID"='${loggedInEmpID}'`
				);
				console.log(new Date());
				await tx.commit();
				return console.log('There are no data to export for the selected criteria.');
			}
		});
		return req.reply('Exporting report...');

		//------------------------------Working Code need to test with UI---------------------------------

		// req._.res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
		// req._.res.set(
		// 	"Content-Disposition","attachment; filename=" + "ClaimListReport.xlsx"
		// );
		// 		const ConvertToBase64 = async() => {
		// 	const fs = require("fs");
		// 	const buffer = await workbook.xlsx.writeBuffer();
		// 	return Buffer.from(buffer);
		// };
		// let rt = await ConvertToBase64();
		//      req._.res.send(rt);

		//-------------------------Working code end----------------------------------------------

	});

	// srv.on('UPDATE', 'excelUpload', (req, next) => {
	//   const url = req._.req.path
	//   if (url.includes('content')) {
	//     const id = req.data.id
	//     //const obj = mediaDB.get(id)
	//     //if (!obj) {
	//     //  req.reject(404, 'No record found for the ID')
	//     //  return
	//     //}
	//     const stream = new PassThrough()
	//     const chunks = [];
	//     const workSheetsFromBuffer='';
	//     stream.on('data', chunk => {
	//       workSheetsFromBuffer = excelnode.parse(chunk)
	//       console.log(workSheetsFromBuffer);
	//     })
	//     //stream.on('end', () => {
	//     //  obj.media = Buffer.concat(chunks).toString('base64')
	//     //  mediaDB.update(obj)
	//     //});
	// return JSON.stringify(workSheetsFromBuffer);
	//   } else return next()
	// })

	srv.on('UPDATE', 'excelUpload', async(req, res) => {
		console.log("Udate");
		var IDKey = req.data.id;
		if (req.data.content) {
			const contentType = req._.req.headers['content-type']
				// Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryBDeMle41o08M3pD0
			let content, workSheetsFromBuffer, rowArray = [],
				keyHeader = [],
				entries = [],
				entriesMaster = [],
				claimStatus = [],
				approvalEntries = [],
				tableArray = [];
			// https://areknawo.com/node-js-file-streams-explained/
			// Read stream
			// await req.data.content.on("data", async dataChunk => {
			// console.log(dataChunk);
			// content += dataChunk;
			// workSheetsFromBuffer = await excelnode.parse(dataChunk)
			// console.log(workSheetsFromBuffer);
			// content += <someTransformation>(dataChunk)
			// });
			// Output stream
			// req.data.content.on("end", () => {
			// console.log("Stream ended");
			// console.log(content);
			// });
			const stream = new PassThrough();

			const chunks = [];

			let request = req;
			// const chunks = []
			stream.on('data', chunk => {
				chunks.push(chunk)
					// const workbook = new Excel.Workbook();
					// await workbook.xlsx.readFile(chunk);
					// const workSheetsFromBuffer = excelnode.parse(chunk)
					// console.log(workSheetsFromBuffer);
			})
			stream.on('end', async() => {
				var media = Buffer.concat(chunks).toString('base64')
					// Working code
				const readable = new Readable()
				const decodedMedia = new Buffer(
					media.split(';base64,').pop(),
					'base64'
				)
				readable.push(decodedMedia)
				readable.push(null)
				const workbook = new Excel.Workbook();
				await workbook.xlsx.read(readable);
				var numberofWroksheet = workbook._worksheets.length;
				var worksheet = workbook.getWorksheet(1);
				var claimName = worksheet.name;
				var tableDetails = tableDetails_Query(claimName);

				if (tableDetails[0].master != undefined) {
					tableArray.push({
						"table": tableDetails[0].master,
						"name": tableDetails[0].label + " master"
					});
				}
				// else {
				tableArray.push({
					"table": tableDetails[0].table,
					"name": tableDetails[0].label
				});
				// }
				for (var numw = 1; numw < numberofWroksheet; numw++) {
					var worksheet = workbook.getWorksheet(numw);
					// var claimName = worksheet.name;
					rowArray = [];
					await worksheet.eachRow({
						includeEmpty: true
					}, function (row, rowNumber) {
						console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
						var rowaftersplice = Object.assign([], row.values);
						rowaftersplice.splice(0, 1)
						if (rowNumber == 1) {
							keyHeader = rowaftersplice;
						} else {
							rowArray.push(rowaftersplice);
						}
					});
					if (tableDetails[0].master != undefined) {
						var claimCodeIndex = keyHeader.indexOf("CLAIM_CODE");
					} else {
						var claimCodeIndex = keyHeader.indexOf("CATEGORY_CODE");
					}

					for (var i = 0; i < rowArray.length; i++) {
						var result = {};
						keyHeader.forEach((key, j) => {
							// if (key == 'CLAIM_REFERENCE') {
							// 	result[key] = rowArray[i][claimCodeIndex] + i + new Date().getTime().toString()
							// } else
							if (key == 'CLAIM_DATE') {
								if (rowArray[i][j] == null || rowArray[i][j] == undefined || rowArray[i][j] == '') {
									result[key] = new Date("1900-01-01").toISOString().substring(0, 10);
								} else {
									result[key] = new Date(rowArray[i][j]).toISOString().substring(0, 10);
								}
							} else {
								// if (key == 'CLAIM_DATE' || key == 'RECEIPT_DATE'){
								// 	// result[key] = rowArray[i][j] == undefined ? '' : rowArray[i][j].toString().split("T")[0];
								// 	console.log(rowArray[i][j].toString().split("T")[0]);
								// 	result[key]='2021-01-01';
								// }
								// else{
								var type = tableArray[numw - 1].table.elements[key].type;
								result[key] = rowArray[i][j] == undefined ? (type == "cds.Decimal" ? 0.00 : '') : rowArray[i][j];
								result[key] = (type == "cds.Decimal" ? (isNaN(result[key]) || result[key] == '' ? 0.00 : parseFloat(result[key])) :
									result[
										key]);
								result[key] = (type == "cds.Integer" ? (isNaN(result[key]) || result[key] == '' ? 0 : parseInt(result[key])) : result[key]);
								// result[key] = (type=="cds.String" ? (typeof result[key] === 'string' ? result[key] : result[key].toString()) : result[key]);

								// }
							}

						});
						var flagToAvoidTheLinItems = '';
						if (tableDetails[0].master != undefined) {
							if (numw > 1) {
								entries.push(result);
								flagToAvoidTheLinItems = 'X'
							} else {
								entriesMaster.push(result);
							}
						} else {
							entries.push(result);
						}

						if (flagToAvoidTheLinItems == '') {
							//Claim Status Addition
							var totallevel = '';
							var finalapprover = '';
							if (result.FOURTH_LEVEL_APPROVER != null && result.FOURTH_LEVEL_APPROVER != '' && result.FOURTH_LEVEL_APPROVER != 'N/A') {
								totallevel = '4';
								finalapprover = result.FOURTH_LEVEL_APPROVER;
							} else if (result.THIRD_LEVEL_APPROVER != null && result.THIRD_LEVEL_APPROVER != '' && result.THIRD_LEVEL_APPROVER != 'N/A') {
								totallevel = '3';
								finalapprover = result.THIRD_LEVEL_APPROVER;
							} else if (result.SECOND_LEVEL_APPROVER != null && result.SECOND_LEVEL_APPROVER != '' && result.SECOND_LEVEL_APPROVER !=
								'N/A') {
								totallevel = '2'
								finalapprover = result.SECOND_LEVEL_APPROVER;
							} else {
								totallevel = '1'
								finalapprover = result.FIRST_LEVEL_APPROVER;
							}
							claimStatus.push({
								Employee_Id: result.EMPLOYEE_ID,
								Claim_Reference: result.CLAIM_REFERENCE,
								Submit_Date: result.CLAIM_DATE,
								Response_Date: null,
								Status: result.CLAIM_STATUS,
								Owner: result.EMPLOYEE_ID,
								Total_Level: totallevel,
								Current_Level: totallevel,
								Approver1: result.FIRST_LEVEL_APPROVER,
								Approver2: result.SECOND_LEVEL_APPROVER,
								Approver3: result.THIRD_LEVEL_APPROVER,
								Approver4: result.FOURTH_LEVEL_APPROVER,
								REMARKS_EMPLOYEE: result.REMARKS_EMPLOYEE,
								REMARKS_APPROVER1: result.REMARKS_APPROVER1,
								REMARKS_APPROVER2: result.REMARKS_APPROVER2,
								REMARKS_APPROVER3: result.REMARKS_APPROVER3,
								REMARKS_APPROVER4: result.REMARKS_APPROVER4,
								REMARKS_REJECTION: result.REMARKS_REJECTION,
								FIRST_LEVEL_APPROVED_ON: result.FIRST_LEVEL_APPROVED_ON,
								SECOND_LEVEL_APPROVED_ON: result.SECOND_LEVEL_APPROVED_ON,
								THIRD_LEVEL_APPROVED_ON: result.THIRD_LEVEL_APPROVED_ON,
								FOURTH_LEVEL_APPROVED_ON: result.FOURTH_LEVEL_APPROVED_ON,
								Submitted_By: result.SUBMITTED_BY,
								Cancel_flag: '',
								Delegation_Comments: '',
								Delegation1: '',
								Delegation2: '',
								Delegation3: '',
								Delegation4: '',
								Reroute1: '',
								Reroute2: '',
								Reroute3: '',
								Reroute4: '',
								Reroute_Comments: ''
							});

							approvalEntries.push({
								CLAIM_REFERENCE: result.CLAIM_REFERENCE,
								EMPLOYEE_ID: finalapprover,
								EMPLOYEE_NAME: finalapprover,
								CLAIM_TYPE: claimCodeIndex,
								CLAIM_DATE: result.CLAIM_DATE,
								AMOUNT: result.CLAIM_AMOUNT,
								CLAIM_STATUS: result.CLAIM_STATUS,
								CATEGORY_CODE: result.CATEGORY_CODE,
								CLAIM_OWNER_ID: result.CATEGORY_CODE,
								CLAIM_CATEGORY: result.CATEGORY_CODE,
								SUBMITTED_BY: result.CATEGORY_CODE,
								ESTIMATEPAYMENTDATE: '1900-01-01',
								RECEIPT_DATE: result.CLAIM_DATE
							});
						}
					}
					console.log(entries);
				}
				var tx = cds.transaction(req);
				await tx.begin();
				try {
					if (tableDetails[0].master != undefined) {
						var insertMaster = await tx.run(INSERT.into(tableArray[0].table).entries(entriesMaster));
						//var insertMaster =1;
						if (insertMaster != 0) {
							var insertDetail = await tx.run(INSERT.into(tableArray[1].table).entries(entries));
						} else {
							return req.reject(404, "Insert into Master failed");
						}
					} else {
						var insert = await tx.run(INSERT.into(tableDetails[0].table).entries(entries));
					}
					var claiminsert = await tx.run(INSERT.into(Claim_Status).entries(claimStatus));
					var approvalInsert = await tx.run(INSERT.into(approval).entries(approvalEntries));
					await tx.run(INSERT.into(upload_errlog).entries({
						id: IDKey,
						error: '',
						success: 'Sucess'
					}));
				} catch (err) {
					console.log(err);
					await tx.run(INSERT.into(upload_errlog).entries({
						id: IDKey,
						error: err.message,
						success: ''
					}));
				}
				await tx.commit();
			});
			req.data.content.pipe(stream);
		} else {
			return next()
		}
	});

	srv.on('UPDATE', 'uploadConfig', async(req, res) => {
		console.log("Udate");
		var IDKey = req.data.id;
		if (req.data.content) {
			const contentType = req._.req.headers['content-type']
			let content, workSheetsFromBuffer, rowArray = [],
				keyHeader = [],
				entries = [],
				entriesMaster = [],
				claimStatus = [],
				approvalEntries = [],
				tableArray = [];
			const stream = new PassThrough();

			const chunks = [];

			let request = req;
			// const chunks = []
			stream.on('data', chunk => {
				chunks.push(chunk)
					// const workbook = new Excel.Workbook();
					// await workbook.xlsx.readFile(chunk);
					// const workSheetsFromBuffer = excelnode.parse(chunk)
					// console.log(workSheetsFromBuffer);
			})
			stream.on('end', async() => {
				var media = Buffer.concat(chunks).toString('base64')
					// Working code
				const readable = new Readable()
				const decodedMedia = new Buffer(
					media.split(';base64,').pop(),
					'base64'
				)
				readable.push(decodedMedia)
				readable.push(null)
				const workbook = new Excel.Workbook();
				await workbook.xlsx.read(readable);
				var numberofWroksheet = workbook._worksheets.length;
				var worksheet = workbook.getWorksheet(1);
				var claimName = worksheet.name;
				var tableDetails = tableDetails_Query(claimName);

				// if (tableDetails[0].master != undefined) {
				// 	tableArray.push({
				// 		"table": tableDetails[0].master,
				// 		"name": tableDetails[0].label + " master"
				// 	});
				// }
				// else {
				tableArray.push({
					"table": tableDetails[0].table,
					"name": tableDetails[0].label
				});
				// }
				for (var numw = 1; numw < numberofWroksheet; numw++) {
					var worksheet = workbook.getWorksheet(numw);
					// var claimName = worksheet.name;
					rowArray = [];
					await worksheet.eachRow({
						includeEmpty: true
					}, function (row, rowNumber) {
						console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
						var rowaftersplice = Object.assign([], row.values);
						rowaftersplice.splice(0, 1)
						if (rowNumber == 1) {
							keyHeader = rowaftersplice;
						} else {
							rowArray.push(rowaftersplice);
						}
					});
					if (tableDetails[0].master != undefined) {
						var claimCodeIndex = keyHeader.indexOf("CLAIM_CODE");
					} else {
						var claimCodeIndex = keyHeader.indexOf("CATEGORY_CODE");
					}

					for (var i = 0; i < rowArray.length; i++) {
						var result = {};
						keyHeader.forEach((key, j) => {
							// if (key == 'CLAIM_REFERENCE') {
							// 	result[key] = rowArray[i][claimCodeIndex] + i + new Date().getTime().toString()
							// } else
							// if (key == 'CLAIM_DATE') {
							// 	if (rowArray[i][j] == null || rowArray[i][j] == undefined || rowArray[i][j] == '') {
							// 		result[key] = new Date("1900-01-01").toISOString().substring(0, 10);
							// 	} else {
							// 		result[key] = new Date(rowArray[i][j]).toISOString().substring(0, 10);
							// 	}
							// } else {
							// if (key == 'CLAIM_DATE' || key == 'RECEIPT_DATE'){
							// 	// result[key] = rowArray[i][j] == undefined ? '' : rowArray[i][j].toString().split("T")[0];
							// 	console.log(rowArray[i][j].toString().split("T")[0]);
							// 	result[key]='2021-01-01';
							// }
							// else{
							var type = tableArray[numw - 1].table.elements[key].type;
							result[key] = rowArray[i][j] == undefined ? (type == "cds.Decimal" ? 0.00 : '') : rowArray[i][j];
							result[key] = (type == "cds.Decimal" ? (isNaN(result[key]) || result[key] == '' ? 0.00 : parseFloat(result[key])) : result[
								key]);
							result[key] = (type == "cds.Integer" ? (isNaN(result[key]) || result[key] == '' ? 0 : parseInt(result[key])) : result[key]);
							result[key] = (type == "cds.Date" ? (result[key].toISOString().split('T')[0]) : result[key]);
							// result[key] = (type=="cds.String" ? (typeof result[key] === 'string' ? result[key] : result[key].toString()) : result[key]);

							// }
							// }

						});
						// var flagToAvoidTheLinItems = '';
						// if (tableDetails[0].master != undefined) {
						// 	if (numw > 1) {
						// 		entries.push(result);
						// 		flagToAvoidTheLinItems = 'X'
						// 	} else {
						// 		entriesMaster.push(result);
						// 	}
						// } else {
						entries.push(result);
						// }

					}
					console.log(entries);
				}
				var tx = cds.transaction(req);
				await tx.begin();
				try {
					// if (tableDetails[0].master != undefined) {
					// 	var insertMaster = await tx.run(INSERT.into(tableArray[0].table).entries(entriesMaster));
					// 	//var insertMaster =1;
					// 	if (insertMaster != 0) {
					// 		var insertDetail = await tx.run(INSERT.into(tableArray[1].table).entries(entries));
					// 	} else {
					// 		return req.reject(404, "Insert into Master failed");
					// 	}
					// } else {
					var insert = await tx.run(INSERT.into(tableDetails[0].table).entries(entries));
					// }
					// var claiminsert = await tx.run(INSERT.into(Claim_Status).entries(claimStatus));
					// var approvalInsert = await tx.run(INSERT.into(approval).entries(approvalEntries));
					await tx.run(INSERT.into(upload_errlog).entries({
						id: IDKey,
						error: '',
						success: 'Sucess'
					}));
				} catch (err) {
					console.log(err);
					await tx.run(INSERT.into(upload_errlog).entries({
						id: IDKey,
						error: err.message,
						success: ''
					}));
				}
				await tx.commit();
			});
			req.data.content.pipe(stream);
		} else {
			return next()
		}
	});

	srv.on('UPDATE', 'pay_up_config', async(req, res) => {
		var IDKey = req.data.id;
		if (req.data.content) {
			const contentType = req._.req.headers['content-type'];
			let content, workSheetsFromBuffer, rowArray = [],
				keyHeader = [],
				entries = [],
				entriesMaster = [],
				claimStatus = [],
				approvalEntries = [],
				tableArray = [];
			const stream = new PassThrough();
			const chunks = [];
			let request = req;
			stream.on('data', chunk => {
				chunks.push(chunk)
			});
			stream.on('end', async() => {
				var media = Buffer.concat(chunks).toString('base64');
				const readable = new Readable();
				const decodedMedia = new Buffer(
					media.split(';base64,').pop(),
					'base64'
				);
				readable.push(decodedMedia);
				readable.push(null);
				const workbook = new Excel.Workbook();
				await workbook.xlsx.read(readable);
				var numberofWroksheet = workbook._worksheets.length;
				var worksheet = workbook.getWorksheet(1);
				var claimName = worksheet.name;
				var tableDetails;
				var tx = cds.transaction(req);
				await tx.begin();
				try {
					tableDetails = tableDetails_Query(claimName);
					tableArray.push({
						"table": tableDetails[0].table,
						"name": tableDetails[0].label
					});
				} catch (err) {
					console.log(err);
					var errMsg = 'Invalid sheet name in excel template. It must be "Pay Upload Temp".';
					var logExistResult = await tx.run(`SELECT * FROM "CALCULATION_UPLOAD_ERRLOG" WHERE "ID"='${IDKey}'`);
					if (logExistResult.length > 0) {
						await tx.run(`UPDATE "CALCULATION_UPLOAD_ERRLOG" SET "ERROR"='${errMsg}', "SUCCESS"='' WHERE "ID"='${IDKey}'`);
					} else {
						await tx.run(INSERT.into(upload_errlog).entries({
							id: IDKey,
							error: errMsg,
							success: ''
						}));
					}
					await tx.commit();
					return;
				}

				for (var numw = 1; numw < numberofWroksheet; numw++) {
					var worksheet = workbook.getWorksheet(numw);
					rowArray = [];
					await worksheet.eachRow({
						includeEmpty: true
					}, function (row, rowNumber) {
						console.log("Row " + rowNumber + " = " + JSON.stringify(row.values));
						var rowaftersplice = Object.assign([], row.values);
						rowaftersplice.splice(0, 1);
						if (rowaftersplice.length > 0) {
							if (rowNumber == 1) {
								keyHeader = rowaftersplice;
							} else {
								rowArray.push(rowaftersplice);
							}
						}
					});

					for (var i = 0; i < rowArray.length; i++) {
						var uuid = gId();
						var result = {};
						keyHeader.forEach((key, j) => {
							var type = tableArray[numw - 1].table.elements[key].type;
							result[key] = rowArray[i][j] == undefined ? (type == "cds.Decimal" ? 0.00 : '') : rowArray[i][j];
							result[key] = (type == "cds.Decimal" ? (isNaN(result[key]) || result[key] == '' ? 0.00 : parseFloat(result[key])) : result[
								key]);
							result[key] = (type == "cds.Integer" ? (isNaN(result[key]) || result[key] == '' ? 0 : parseInt(result[key])) : result[key]);
							result[key] = (type == "cds.Date" && result[key]) ? (result[key].toISOString().split('T')[0]) : result[key];

							if (key === 'SCHOLAR_ID') {
								result[key] = (rowArray[i][j] !== undefined && rowArray[i][j] !== null) ? rowArray[i][j].toString() : rowArray[i][j];
							}
						});
						result["ID"] = uuid;
						result["UPLOAD_REFERENCE_ID"] = IDKey;
						entries.push(result);
					}
					console.log(entries);
				}

				try {
					let deletedReocrds = await tx.run(`DELETE FROM "CALCULATION_PAY_UP"`);
					console.log(deletedReocrds);
					var insert = await tx.run(INSERT.into(PAY_UP).entries(entries));
					var logExistResult2 = await tx.run(`SELECT * FROM "CALCULATION_UPLOAD_ERRLOG" WHERE "ID"='${IDKey}'`);
					if (logExistResult2.length > 0) {
						await tx.run(`UPDATE "CALCULATION_UPLOAD_ERRLOG" SET "SUCCESS"='Successfully Uploaded', "ERROR"='' WHERE "ID"='${IDKey}'`);
					} else {
						await tx.run(INSERT.into(upload_errlog).entries({
							id: IDKey,
							error: '',
							success: 'Successfully Uploaded'
						}));
					}
				} catch (err) {
					console.log(err);
					var logExistResult3 = await tx.run(`SELECT * FROM "CALCULATION_UPLOAD_ERRLOG" WHERE "ID"='${IDKey}'`);
					if (logExistResult3.length > 0) {
						await tx.run(`UPDATE "CALCULATION_UPLOAD_ERRLOG" SET "ERROR"='${err.message}', "SUCCESS"='' WHERE "ID"='${IDKey}'`);
					} else {
						await tx.run(INSERT.into(upload_errlog).entries({
							id: IDKey,
							error: err.message,
							success: ''
						}));
					}
				}
				await tx.commit();
			});
			req.data.content.pipe(stream);
		} else {
			return next();
		}
	});

	function tableDetails_Query(claim) {
		var claim_array = [{
			table: Medical_Claim,
			label: "Medical Claim"
		}, {
			table: overtime_claim,
			label: "Timesheet"
		}, {
			table: PC_CLAIM,
			label: "Petty Cash"
		}, {
			table: PTF_ACL_BCL_CLAIM,
			label: "PTF_ACL_BCL"
		}, {
			table: AHP_LIC_MS_WIC_CLAIM,
			label: "AHP_LIC_MS_WIC"
		}, {
			table: CPR_CLAIM,
			label: "Clinical Placement Request"
		}, {
			table: WRC_LINEITEM_CLAIM,
			master: WRC_MASTER_CLAIM,
			label: "WRC Claim"
		}, {
			table: WRC_HR_LINEITEM_CLAIM,
			master: WRC_HR_MASTER_CLAIM,
			label: "WRC HR Claim"
		}, {
			table: COV_LINEITEM_CLAIM,
			master: COV_MASTER_CLAIM,
			label: "Covid Claim"
		}, {
			table: SP_LINEITEM_CLAIM,
			master: SP_MASTER_CLAIM,
			label: "Sponsorship Exit Exam"
		}, {
			table: SP1_LINEITEM_CLAIM,
			master: SP1_MASTER_CLAIM,
			label: "Sponsorship Int Conf"
		}, {
			table: SP2_LINEITEM_CLAIM,
			master: SP2_MASTER_CLAIM,
			label: "Sponsorship Reg Conf"
		}, {
			table: SP3_LINEITEM_CLAIM,
			master: SP3_MASTER_CLAIM,
			label: "Sponsorship Residents"
		}, {
			table: TC_LINEITEM_CLAIM,
			master: TC_MASTER_CLAIM,
			label: "Transport"
		}, {
			table: SDFC_LINEITEM_CLAIM,
			master: SDFC_MASTER_CLAIM,
			label: "SDF Claims"
		}, {
			table: SDFR_LINEITEM_CLAIM,
			master: SDFR_MASTER_CLAIM,
			label: "SDF Request"
		}, {
			table: CPC_LINEITEM_CLAIM,
			master: CPC_MASTER_CLAIM,
			label: "Placement Claim"
		}, {
			table: OC_LINEITEM_CLAIM,
			master: OC_MASTER_CLAIM,
			label: "Other Claims"
		}, {
			table: PAY_UP_LINEITEM_CLAIM,
			master: PAY_UP_MASTER_CLAIM,
			label: "Payment Upload"
		}, {
			table: Benefit_Claim_Admin,
			label: "Benefit Claim Admin"
		}, {
			table: Benefit_Eligibility,
			label: "Benefit Eligibility"
		}, {
			table: Co_Payment,
			label: "Co Payment"
		}, {
			table: Location_RO,
			label: "Location RO"
		}, {
			table: CLAIM_COORDINATOR,
			label: "CLAIM COORDINATOR"
		}, {
			table: PAY_UP,
			label: "Pay Upload Temp"
		}];

		var tableDetails = claim_array.filter(findClaimTable)

		function findClaimTable(item) {
			return item.label == claim;
		}

		return tableDetails;
	}

	srv.on('exportExcelTemplate', async req => {
		var claim = req.data.CLAIM;
		let tx = cds.transaction(req);

		var worksheetColoumn = [],
			tableArray = [],
			worksheet = "";
		const workbook = new Excel.Workbook();

		var tableDetails = tableDetails_Query(claim);

		if (tableDetails[0].master != undefined) {
			tableArray.push({
				"table": tableDetails[0].master,
				"name": tableDetails[0].label
			});
			tableArray.push({
				"table": tableDetails[0].table,
				"name": tableDetails[0].label + " LineItem"
			});
		} else {
			tableArray.push({
				"table": tableDetails[0].table,
				"name": tableDetails[0].label
			});
		}

		for (var i = 0; i < tableArray.length; i++) {
			worksheetColoumn = [];
			var claimList = await tx.run(SELECT.one.from(tableArray[i].table));

			//------------Creating the Excel Coloumn using the Table Key fields
			// if (claimList.length != 0) {
			Object.keys(claimList).forEach(key => {

				var hidden = false;
				if (claim == "Pay Upload Temp" && (key == "ID" || key == "SCHOLAR_UNIV" || key == "SCHOLAR_SCHEME" || key == "SCHOLAR_DISC" ||
						key ==
						"GL_ACCOUNT" || key == "UPLOAD_REFERENCE_ID")) {
					hidden = true
				}

				worksheetColoumn.push({
					header: key,
					key: key,
					hidden: hidden
				})
			})

			worksheet = workbook.addWorksheet(tableArray[i].name);
			worksheet.properties.outlineProperties = {
				summaryBelow: false,
				summaryRight: false,
			};
			worksheet.columns = worksheetColoumn;
			// worksheetarray[claimIndex].addRows(claimList);
			// worksheetarray[claimIndex].getRow(3).outlineLevel = 1;
			// }
		}
		if (workbook.worksheets.length != 0) {
			const ConvertToBase64 = async() => {
				const fs = require("fs");
				const buffer = await workbook.xlsx.writeBuffer();
				return Buffer.from(buffer).toString("base64");
			};
			let rt = await ConvertToBase64();
			return rt;
		} else {
			return req.reject(404, "There are no data to export for the selected criteria");
		}

	})

	srv.on('getUploadErrorLog', async req => {
		var id = req.data.id;
		var tx = cds.transaction(req);
		var errorlog = await tx.run(SELECT.from(upload_errlog).where({
			id: id
		}))
		if (errorlog.length != 0) {
			await tx.run(DELETE.from(upload_errlog).where({
				id: id
			}))
			return errorlog[0];
		} else {
			await tx.run(`DELETE FROM "CALCULATION_PAY_UP"`);
			return req.reject(404, "There is no Data available for the ID");
		}
	})

	srv.on('getPay_Up_LineItems', async req => {
		var id = req.data.id;
		var paymentTo = req.data.paymentTo;
		console.log(paymentTo);
		if (!id) {
			return req.reject(400, "Please provide value in mandatory parameter: id");
		}
		if (paymentTo !== 'Scholar' && paymentTo !== 'Vendor') {
			return req.reject(400, "Invalid value. Please provide correct value in paymentTo: Scholar or Vendor");
		}
		var tx = cds.transaction(req);
		var errorMsg = '';
		var payUpResult = await tx.run(
			`
			SELECT
				"PAY_UP".*,
				"CLAIM_MASTER"."DESCRIPTION" AS "CLAIM_CODE_DESCRIPTION",
				"GL_MAP"."GL_ACC" AS "GL_ACCOUNT",
				"PER_PERSON"."CUSTOMSTRING2" AS "SCHOLAR_NAME",
				"SCH_INFLIGHT"."CUST_SCHOOL" AS "SCHOLAR_UNIV",
			 	"SCH"."CUST_DISCIPLINE" AS "SCHOLAR_DISC",
				"SCH"."CUST_SCHOLARSHIPSCHEME" AS "SCHOLAR_SCHEME",
				"BANK"."CUST_BANKNAME",
				"BANK"."CUST_CURRENCY",
				"BANK"."CUST_ACCOUNTOWNER",
				"BANK"."CUST_BANKACCOUNTNUMBER",
				"BANK"."CUST_PRIMARYBANKACCOUNTSTR",
				"BANK"."CUST_VENDORCODE",
				"OVRSEAS_BANK"."CUST_ACCOUNTOWNER" AS "OVRSEAS_CUST_ACCOUNTOWNER",
				"OVRSEAS_BANK"."CUST_BANKACCOUNTNUMBER" AS "OVRSEAS_CUST_BANKACCOUNTNUMBER",
				"OVRSEAS_BANK"."CUST_CURRENCY" AS "OVRSEAS_CUST_CURRENCY",
				"OVRSEAS_BANK"."CUST_BANK" AS "OVRSEAS_CUST_BANKNAME",
				"OVRSEAS_BANK"."CUST_PRIMARYBANKSTR" AS "OVRSEAS_CUST_PRIMARYBANKSTR"
			FROM "CALCULATION_PAY_UP" AS "PAY_UP"
			LEFT JOIN (SELECT "SCH1".* FROM "SF_SCHOLAR_SCHEME" AS "SCH1" INNER JOIN (SELECT  "EXTERNALCODE", MAX("EFFECTIVESTARTDATE") AS "EFFECTIVESTARTDATE" FROM "SF_SCHOLAR_SCHEME"
			GROUP BY "EXTERNALCODE") AS "SCH2" ON "SCH1"."EFFECTIVESTARTDATE"="SCH2"."EFFECTIVESTARTDATE" AND "SCH1"."EXTERNALCODE"="SCH2"."EXTERNALCODE"
			) AS "SCH"
			ON "SCH"."EXTERNALCODE" = "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN (SELECT "SCH_INFLIGHT1".* FROM "SF_INFLIGHT_SCHOLAR" AS "SCH_INFLIGHT1" INNER JOIN (SELECT  "EXTERNALCODE", MAX("EFFECTIVESTARTDATE") AS "EFFECTIVESTARTDATE" FROM "SF_INFLIGHT_SCHOLAR"
			GROUP BY "EXTERNALCODE") AS "SCH_INFLIGHT2" ON "SCH_INFLIGHT1"."EFFECTIVESTARTDATE"="SCH_INFLIGHT2"."EFFECTIVESTARTDATE" AND "SCH_INFLIGHT1"."EXTERNALCODE"="SCH_INFLIGHT2"."EXTERNALCODE"
			) AS "SCH_INFLIGHT"
			ON "SCH_INFLIGHT"."EXTERNALCODE" = "PAY_UP"."SCHOLAR_ID" 
			LEFT JOIN (SELECT "PER_PERSON1".* FROM "SF_PERPERSONAL" AS "PER_PERSON1" INNER JOIN (SELECT "PERSONIDEXTERNAL", MAX("STARTDATE") AS "STARTDATE" FROM "SF_PERPERSONAL"
				GROUP BY "PERSONIDEXTERNAL") AS "PER_PERSON2" ON "PER_PERSON1"."STARTDATE"="PER_PERSON2"."STARTDATE" AND "PER_PERSON1"."PERSONIDEXTERNAL"="PER_PERSON2"."PERSONIDEXTERNAL"
			) AS "PER_PERSON"
			ON "PER_PERSON"."PERSONIDEXTERNAL" = "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "BENEFIT_GL_MAPPING" AS "GL_MAP"
			ON "SCH"."CUST_SCHOLARSHIPSCHEME" = "GL_MAP"."SCHOLAR_SCHEME"
			LEFT JOIN (SELECT "SF_BANK_ACC1".* FROM "SF_BANK_ACC" AS "SF_BANK_ACC1" INNER JOIN (SELECT "EXTERNALCODE", MAX("EFFECTIVESTARTDATE") AS "MAXEFFECTIVESTARTDATE" FROM "SF_BANK_ACC"
				GROUP BY "EXTERNALCODE") AS "SF_BANK_ACC2" ON "SF_BANK_ACC1"."EFFECTIVESTARTDATE"="SF_BANK_ACC2"."MAXEFFECTIVESTARTDATE" AND "SF_BANK_ACC1"."EXTERNALCODE"="SF_BANK_ACC2"."EXTERNALCODE"
			) AS "BANK"
			ON "BANK"."EXTERNALCODE"= "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN (SELECT "OVRSEAS_BANK1".* FROM "SF_OVERSEAS_BANK" AS "OVRSEAS_BANK1" INNER JOIN (SELECT "CUST_BANKACCOUNT_EXTERNALCODE", MAX("LASTMODIFIEDDATETIME") AS "LASTMODIFIEDDATETIME" FROM "SF_OVERSEAS_BANK"
				GROUP BY "CUST_BANKACCOUNT_EXTERNALCODE") AS "OVRSEAS_BANK2" ON "OVRSEAS_BANK1"."LASTMODIFIEDDATETIME"="OVRSEAS_BANK2"."LASTMODIFIEDDATETIME" AND "OVRSEAS_BANK1"."CUST_BANKACCOUNT_EXTERNALCODE"="OVRSEAS_BANK2"."CUST_BANKACCOUNT_EXTERNALCODE"
			) AS "OVRSEAS_BANK"
			ON "OVRSEAS_BANK"."CUST_BANKACCOUNT_EXTERNALCODE"= "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "BENEFIT_CLAIM_CODE" AS "CLAIM_MASTER"
			ON "CLAIM_MASTER"."CLAIM_CODE"="PAY_UP"."CLAIM_CODE"
			WHERE "PAY_UP"."UPLOAD_REFERENCE_ID"='${id}'
		`
		);

		if (payUpResult.length === 0) {
			return req.reject(400, "Please provide data in the excel template.");
		}
		let currenciesExists = [];
		for (let i = 0; i < payUpResult.length; i++) {
			let lineItemErrorMsg = '';
			if (payUpResult[i].SCHOLAR_ID) {
				let scholarResult = await tx.run(
					`SELECT "USERID" FROM "SF_EMPJOB" WHERE "USERID"='${payUpResult[i].SCHOLAR_ID}' AND "COMPANY"='MOHHSCH'`);
				if (scholarResult.length === 0) {
					lineItemErrorMsg += `Invalid Scholar ID.`;
				}
			} else {
				lineItemErrorMsg += `Scholar ID is required.`;
			}

			if (payUpResult[i].VENDOR_CODE) {
				if (paymentTo === 'Scholar') {
					let bankVendorResult = await tx.run(
						`SELECT "CUST_VENDORCODE" FROM "SF_BANK_ACC" WHERE "EXTERNALCODE"='${payUpResult[i].SCHOLAR_ID}' AND "CUST_VENDORCODE"='${payUpResult[i].VENDOR_CODE}'`
					);
					if (bankVendorResult.length === 0) {
						lineItemErrorMsg += `Invalid Vendor Code.`;
					}
				} else {
					let vendorResult = await tx.run(
						`SELECT "VENDOR_CODE" FROM "BENEFIT_VENDOR" WHERE "VENDOR_CODE"='${payUpResult[i].VENDOR_CODE}'`
					);
					if (vendorResult.length === 0) {
						lineItemErrorMsg += `Invalid Vendor Code.`;
					}
				}
			} else if (paymentTo === 'Vendor') {
				lineItemErrorMsg += `Vendor Code is required.`;
			}
			if (!payUpResult[i].ITEM_DESC) {
				lineItemErrorMsg += `Item description is required.`;
			}

			if (payUpResult[i].ITEM_DESC && payUpResult[i].ITEM_DESC.toString().length > 50) {
				lineItemErrorMsg += `Item description should not exceed 50 characters length.`;
			}

			if (payUpResult[i].INVOICE_NUMBER && (payUpResult[i].INVOICE_NUMBER.toString().includes(',') || payUpResult[i].INVOICE_NUMBER.toString()
					.includes('*') || payUpResult[i].INVOICE_NUMBER.toString().includes('_'))) {
				lineItemErrorMsg += `Invoice Number should not contains ",", "*", "_".`;
			}

			if (payUpResult[i].CURRENCY) {
				let currencyExist = currenciesExists.find((currency) => {
					return currency === payUpResult[i].CURRENCY;
				});
				if (!currencyExist) {
					currenciesExists.push(payUpResult[i].CURRENCY);
				}
			}

			if (paymentTo === 'Scholar' && payUpResult[i].CURRENCY) {
				if (payUpResult[i].CUST_PRIMARYBANKACCOUNTSTR === 'Y') {
					let currencyResult = await tx.run(
						`SELECT "CUST_CURRENCY" FROM "SF_BANK_ACC" WHERE "EXTERNALCODE"='${payUpResult[i].SCHOLAR_ID}' AND "CUST_CURRENCY"='${payUpResult[i].CURRENCY}'`
					);
					if (currencyResult.length === 0) {
						lineItemErrorMsg += `Invalid Currency. Currency must match scholar's primary bank currency.`;
					}
				} else {
					let currencyResult = await tx.run(
						`SELECT "CUST_CURRENCY" FROM "SF_OVERSEAS_BANK" WHERE "CUST_BANKACCOUNT_EXTERNALCODE"='${payUpResult[i].SCHOLAR_ID}' AND "CUST_CURRENCY"='${payUpResult[i].CURRENCY}'`
					);
					if (currencyResult.length === 0) {
						lineItemErrorMsg += `Invalid Currency. Currency must match scholar's primary bank currency.`;
					}
				}
			}

			if (payUpResult[i].INVOICE_DATE && new Date(payUpResult[i].INVOICE_DATE) > new Date()) {
				lineItemErrorMsg += `Invalid Invoice Date. Invoice date should not be future date.`;
			}

			if (paymentTo === 'Scholar' && payUpResult[i].OVRSEAS_CUST_PRIMARYBANKSTR === 'Y') {
				payUpResult[i].CUST_BANKNAME = payUpResult[i].OVRSEAS_CUST_BANKNAME;
				payUpResult[i].CUST_CURRENCY = payUpResult[i].OVRSEAS_CUST_CURRENCY;
				payUpResult[i].CUST_ACCOUNTOWNER = payUpResult[i].OVRSEAS_CUST_ACCOUNTOWNER;
				payUpResult[i].CUST_BANKACCOUNTNUMBER = payUpResult[i].OVRSEAS_CUST_BANKACCOUNTNUMBER;
			}

			if (paymentTo === 'Vendor') {
				payUpResult[i].CUST_BANKNAME = '';
				payUpResult[i].CUST_CURRENCY = '';
				payUpResult[i].CUST_ACCOUNTOWNER = '';
				payUpResult[i].CUST_BANKACCOUNTNUMBER = '';
				payUpResult[i].CUST_PRIMARYBANKACCOUNTSTR = '';
				payUpResult[i].OVRSEAS_CUST_ACCOUNTOWNER = '';
				payUpResult[i].OVRSEAS_CUST_BANKACCOUNTNUMBER = '';
				payUpResult[i].OVRSEAS_CUST_CURRENCY = '';
				payUpResult[i].OVRSEAS_CUST_BANKNAME = '';
				payUpResult[i].OVRSEAS_CUST_PRIMARYBANKSTR = '';
			}

			if (lineItemErrorMsg && !lineItemErrorMsg.includes(`Item ${i + 1}:`)) {
				lineItemErrorMsg = `Item ${i + 1}: ` + lineItemErrorMsg;
			}
			if (lineItemErrorMsg && !lineItemErrorMsg.includes(`\n`)) {
				lineItemErrorMsg = lineItemErrorMsg + `\n`;
			}
			errorMsg += lineItemErrorMsg;
		}
		if (currenciesExists.length > 1) {
			errorMsg = 'Only single currency allowed at a time in the upload template.';
		}
		if (errorMsg) {
			return req.reject(422, errorMsg);
		} else {
			return payUpResult;
		}
	});

	srv.on('getScholarsBankDetails', async req => {
		let scholarIDs = req.data.SCHOLAR_IDs;
		console.log(scholarIDs);
		let scholarIDsString = '';
		if (scholarIDs.length === 0) {
			return [];
		}
		if (scholarIDs.length === 1) {
			scholarIDsString = scholarIDs[0].SCHOLAR_ID.toString();
		} else {
			let IDs = [];
			for (let i = 0; i < scholarIDs.length; i++) {
				IDs.push(scholarIDs[i].SCHOLAR_ID);
			}
			scholarIDsString = IDs.join("','");
		}
		try {
			let tx = cds.transaction(req);
			let bankDetailsResult = await tx.run(
				`
				SELECT
					"BANK"."EXTERNALCODE",
					"BANK"."CUST_BANKNAME",
					"BANK"."CUST_CURRENCY",
					"BANK"."CUST_ACCOUNTOWNER",
					"BANK"."CUST_BANKACCOUNTNUMBER",
					"BANK"."CUST_PRIMARYBANKACCOUNTSTR",
					"BANK"."CUST_VENDORCODE",
					"OVRSEAS_BANK"."CUST_BANKACCOUNT_EXTERNALCODE",
					"OVRSEAS_BANK"."CUST_ACCOUNTOWNER" AS "OVRSEAS_CUST_ACCOUNTOWNER",
					"OVRSEAS_BANK"."CUST_BANKACCOUNTNUMBER" AS "OVRSEAS_CUST_BANKACCOUNTNUMBER",
					"OVRSEAS_BANK"."CUST_CURRENCY" AS "OVRSEAS_CUST_CURRENCY",
					"OVRSEAS_BANK"."CUST_BANK" AS "OVRSEAS_CUST_BANKNAME",
					"OVRSEAS_BANK"."CUST_PRIMARYBANKSTR" AS "OVRSEAS_CUST_PRIMARYBANKSTR"
				FROM (SELECT "SF_BANK_ACC1".* FROM "SF_BANK_ACC" AS "SF_BANK_ACC1" INNER JOIN (SELECT "EXTERNALCODE", MAX("EFFECTIVESTARTDATE") AS "MAXEFFECTIVESTARTDATE" FROM "SF_BANK_ACC"
					GROUP BY "EXTERNALCODE") AS "SF_BANK_ACC2" ON "SF_BANK_ACC1"."EFFECTIVESTARTDATE"="SF_BANK_ACC2"."MAXEFFECTIVESTARTDATE" AND "SF_BANK_ACC1"."EXTERNALCODE"="SF_BANK_ACC2"."EXTERNALCODE"
				) AS "BANK" LEFT JOIN (SELECT "OVRSEAS_BANK1".* FROM "SF_OVERSEAS_BANK" AS "OVRSEAS_BANK1" INNER JOIN (SELECT "CUST_BANKACCOUNT_EXTERNALCODE", MAX("LASTMODIFIEDDATETIME") AS "LASTMODIFIEDDATETIME" FROM "SF_OVERSEAS_BANK"
					GROUP BY "CUST_BANKACCOUNT_EXTERNALCODE") AS "OVRSEAS_BANK2" ON "OVRSEAS_BANK1"."LASTMODIFIEDDATETIME"="OVRSEAS_BANK2"."LASTMODIFIEDDATETIME" AND "OVRSEAS_BANK1"."CUST_BANKACCOUNT_EXTERNALCODE"="OVRSEAS_BANK2"."CUST_BANKACCOUNT_EXTERNALCODE"
				) AS "OVRSEAS_BANK"
				ON "OVRSEAS_BANK"."CUST_BANKACCOUNT_EXTERNALCODE"= "BANK"."EXTERNALCODE"
				WHERE "BANK"."EXTERNALCODE" IN ('${scholarIDsString}') OR "OVRSEAS_BANK"."CUST_BANKACCOUNT_EXTERNALCODE" IN ('${scholarIDsString}')
			`
			);
			if (bankDetailsResult.length === 0) {
				return [];
			} else {
				return bankDetailsResult;
			}
		} catch (err) {
			return req.reject(422, err.message);
		}
	});

	function convertTimeZone(dateValue, tz) {
		return new Date(new Date(dateValue).toLocaleString("en-US", {
			timeZone: tz
		}));
	}

	function dateTimeFormat(dateValue) {
		var sDate = new Date(dateValue).toISOString();
		var splittedDate = sDate.split("T");
		splittedDate[1] = splittedDate[1].split(".")[0];
		var sFormattedDate = splittedDate.join(" ");
		return sFormattedDate;
	}

	function _appendQueryForChargePayout(req) {
		var sAPPENDQUERY = ``,
			sWHERE = ``;
		var otherFilter = [];
		let Cluster = req.data.Cluster.replace("[", "(").replace("]", ")").replace(/"/g, "'");
		let SCH_SCHEME = req.data.SCH_SCHEME.replace("[", "(").replace("]", ")").replace(/"/g, "'");
		let YearOfAward = req.data.YearOfAward.replace("[", "(").replace("]", ")").replace(/"/g, "'");
		let Sch_Status = req.data.Sch_Status.replace("[", "(").replace("]", ")").replace(/"/g, "'");
		if (Cluster != "") {
			otherFilter.push(`PAYOUT.FUNDING_CLUSTER in ${Cluster}`)
		}
		if (SCH_SCHEME != "") {
			otherFilter.push(`PAYOUT.SCHOLAR_SCHEME in ${SCH_SCHEME}`)
		}
		if (YearOfAward != "") {
			otherFilter.push(`PAYOUT.YEAR_OF_AWARD in ${YearOfAward}`)
		}
		// if (Sch_Status != "") {
		// 	otherFilter.push(`PAYOUT.CLAIM_REFERENCE = '${Sch_Status}'`)
		// }
		// if (Post_Period != "") {
		// 	otherFilter.push(`PAYOUT.CLAIM_REFERENCE = '${CLAIM_REFERENCE}'`)
		// }
		// 	if(Personal_Subarea != ""){
		// 		 employeejob = ` INNER JOIN "SF_EMPJOB" as EMPJOB
		// on EMPJOB."USERID" = APP."EMPLOYEE_ID"`;

		// 		otherFilter.push( `EMPJOB."LOCATION" = '${Personal_Subarea}' AND EMPJOB."STARTDATE" <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// and EMPJOB."ENDDATE" >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')`)
		// 	}
		for (index in otherFilter) {
			if (index == 0) {
				if (sWHERE == ``) {
					sWHERE += ` WHERE ` + otherFilter[index];
				} else {
					sWHERE += ` AND ` + otherFilter[index];
				}

			} else {
				sWHERE += ` AND ` + otherFilter[index];
			}

		}

		// 	//REP LOGS STATUS
		// 	if (sWHERE == ``) {
		// 		sWHERE += `WHERE (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		// 	} else {
		// 		sWHERE += ` AND (Replication_Logs."REP_STATUS" <> 'Error' or Replication_Logs."REP_STATUS" is Null)`;
		// 	}

		var sAPPENDQUERY = sWHERE;
		console.log(sAPPENDQUERY);
		// var sAPPENDQUERY = CLAIMJOIN + sWHERE;
		return sAPPENDQUERY;
		// return sAPPENDQUERY
	}

	srv.on('chargePayoutReport', async(req, next) => {
		let tx = cds.transaction(req);
		let Cluster = req.data.Cluster;
		let SCH_SCHEME = req.data.SCH_SCHEME;
		let YearOfAward = req.data.YearOfAward;
		let Sch_Status = req.data.Sch_Status;
		let Post_PeriodF = req.data.Post_FromDate;
		let Post_PeriodT = req.data.Post_ToDate;

		//------Set filter for report
		var sAPPENDQUERY = _appendQueryForChargePayout(req);

		var payout = [{
			table: `"SF_CHARGE_PAYABLE_OUT"(postingFrom => '${Post_PeriodF}' ,postingTo => '${Post_PeriodT}')`,
			label: "Payable"
		}, {
			table: `"SF_SCHOLAR_EXPENSE"(postingFrom => '${Post_PeriodF}' ,postingTo => '${Post_PeriodT}')`,
			label: "Scholarship Expense Overview"
		}, {
			table: `"SF_INDIVIDUAL_SCH_EXP"(postingFrom => '${Post_PeriodF}' ,postingTo => '${Post_PeriodT}')`,
			label: "Individual Scholar Expenses"
		}];

		var worksheetColoumn = [],
			worksheetarray = [],
			worksheetColoumnItem = [], //new ItemWorksheet
			worksheetarrayItem = []; //new ItemWorksheet

		const workbook = new Excel.Workbook();

		//-------------- Claims without lineitems retrieval------------------------
		for (let payoutIndex in payout) {
			worksheetColoumn = [];
			if (payout[payoutIndex].label !== "Individual Scholar Expenses") {
				var payoutList = await tx.run(
					`SELECT PAYOUT.* FROM ${payout[payoutIndex].table} as PAYOUT` + sAPPENDQUERY);

				//------------Creating the Excel Coloumn using the Table Key fields
				if (payoutList.length != 0) {
					Object.keys(payoutList[0]).forEach(key => {
						worksheetColoumn.push({
							header: key,
							key: key
						})
					})

					worksheetarray[payoutIndex] = workbook.addWorksheet(payout[payoutIndex].label);
					worksheetarray[payoutIndex].properties.outlineProperties = {
						summaryBelow: false,
						summaryRight: false,
					};
					worksheetarray[payoutIndex].columns = worksheetColoumn;
					worksheetarray[payoutIndex].addRows(payoutList);
					// worksheetarray[claimIndex].getRow(3).outlineLevel = 1;
				}
			} else {
				var scholarArray = await tx.run(
					`SELECT distinct PAYOUT.SCHOLAR_ID FROM ${payout[payoutIndex].table} as PAYOUT` + sAPPENDQUERY);
				var payoutList = await tx.run(
					`SELECT PAYOUT.* FROM ${payout[payoutIndex].table} as PAYOUT` + sAPPENDQUERY);

				if (payoutList.length != 0) {
					Object.keys(payoutList[0]).forEach(key => {
						worksheetColoumn.push({
							header: key,
							key: key
						})
					})
					for (var index in scholarArray) {

						var individualList = payoutList.filter(getScholar);

						function getScholar(item) {
							return item.SCHOLAR_ID == scholarArray[index].SCHOLAR_ID;
						}
						// worksheetarray[payoutIndex+index] = workbook.addWorksheet(payout[payoutIndex].label+" "+scholarArray[index].EMPLOYEE_ID);
						worksheetarray[payoutIndex + index] = workbook.addWorksheet(scholarArray[index].SCHOLAR_ID + " Expenses")
						worksheetarray[payoutIndex + index].properties.outlineProperties = {
							summaryBelow: false,
							summaryRight: false,
						};
						worksheetarray[payoutIndex + index].columns = worksheetColoumn;
						worksheetarray[payoutIndex + index].addRows(individualList);
						// worksheetarray[claimIndex].getRow(3).outlineLevel = 1;
					}
				}
			}
		}

		if (workbook.worksheets.length != 0) {
			const ConvertToBase64 = async() => {
				const fs = require("fs");
				const buffer = await workbook.xlsx.writeBuffer();
				return Buffer.from(buffer).toString("base64");
			};
			let rt = await ConvertToBase64();
			return rt;

		} else {
			return req.reject(404, "There are no data to export for the selected criteria");
		}
	});

}