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
		PAY_UP
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

		// var options = { hour12: false };
		// var current = new Date().toLocaleString('en-DE', options);
		// current = current.split(",")[0].split("/").reverse().join("-")+current.split(",")[1];

		var claim_Refernce =
			` LEFT JOIN "BENEFIT_CANCELAFTERAPPROVEVIEW" as WITHCANCEL
							on WITHCANCEL."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;

		var current = new Date().toJSON().split("T")[0];

		if (Personnel_Area != "" && Personal_Subarea != "" && hrAdmin != "") {
			var Criterias_Employee_INNER =
				`SELECT * FROM "BENEFIT_HR_ADMIN_EMPLOYEE" 
			WHERE "HR_USER" ='${hrAdmin}' AND "PERSONNEL_AREA" ='${Personnel_Area}' AND "PERSONAL_SUBAREA"='${Personal_Subarea}'`;
			if (Pay_Grade != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "PAY_GRADE" = '${Pay_Grade}' `;
			}
			if (Division != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "DIVISION" = '${Division}' `
			}

			var Criterias_Employee =
				` INNER JOIN (SELECT DISTINCT WITHINCLUDE."USERID"
			FROM (SELECT * FROM (${Criterias_Employee_INNER}) as HRADMIN  
			LEFT JOIN "BENEFIT_INC_HRA_EMP" as INCLUDE
			ON INCLUDE."ADMIN_HR_USER" = HRADMIN."HR_USER"
			AND INCLUDE."ADMIN_SEQUENCE" = HRADMIN."SEQUENCE") as WITHINCLUDE
			LEFT OUTER JOIN "BENEFIT_EXC_HRA_EMP" as EXCLUDE
			ON EXCLUDE."ADMIN_HR_USER" = WITHINCLUDE."HR_USER"
			AND EXCLUDE."ADMIN_SEQUENCE" = WITHINCLUDE."SEQUENCE"
			AND WITHINCLUDE."USERID" = EXCLUDE."USERID") as HR_EMP
			ON APP."EMPLOYEE_ID"= HR_EMP."USERID" `
		} else {
			var Criterias_Employee = ``;
		}

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
						  ON APP.EMPLOYEE_ID = coordinate.EMPLOYEEID `;
		} else {
			var CLAIMJOIN = ' ';
		}

		if (employeeId == "" && filterStartDate == "" && filterEndDate == "") {
			var sWHERE = `WHERE "CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId != "" && filterStartDate == "" && filterEndDate == "") {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE = `WHERE "EMPLOYEE_ID" IN ${removeArray}`;
			} else {
				var sWHERE = `WHERE "EMPLOYEE_ID" = '${employeeId}'`;
			}

			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId == "" && filterStartDate != "" && filterEndDate != "") {
			var sWHERE = `WHERE "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;

			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
		} else {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE =
					`WHERE "EMPLOYEE_ID" IN ${removeArray} AND "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;
			} else {
				var sWHERE =
					`WHERE "EMPLOYEE_ID" = '${employeeId}' AND "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;

			}
			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
		}

		var otherFilter = [];
		if (CATEGORY_CODE != "") {
			otherFilter.push(`CATEGORY_CODE = '${CATEGORY_CODE}'`)
		}
		if (CLAIM_STATUS != "") {
			otherFilter.push(`CLAIM_STATUS = '${CLAIM_STATUS}'`)
		}
		if (CLAIM_TYPE != "") {
			otherFilter.push(`CLAIM_TYPE = '${CLAIM_TYPE}'`)
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

		var sAPPENDQUERY = claim_Refernce + Criterias_Employee + CLAIMJOIN + sWHERE;
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

		// var options = { hour12: false };
		// var current = new Date().toLocaleString('en-DE', options);
		// current = current.split(",")[0].split("/").reverse().join("-")+current.split(",")[1];
		var payup = ` INNER JOIN "BENEFIT_PAY_UP_LINEITEM_CLAIM" as LINEPAY
					ON LINEPAY."PARENT_CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`
		var claim_Refernce =
			` LEFT JOIN "BENEFIT_CANCELAFTERAPPROVEVIEW" as WITHCANCEL
							on WITHCANCEL."CLAIM_REFERENCE" = APP."CLAIM_REFERENCE"`;

		var current = new Date().toJSON().split("T")[0];

		if (Personnel_Area != "" && Personal_Subarea != "" && hrAdmin != "") {
			var Criterias_Employee_INNER =
				`SELECT * FROM "BENEFIT_HR_ADMIN_EMPLOYEE" 
			WHERE "HR_USER" ='${hrAdmin}' AND "PERSONNEL_AREA" ='${Personnel_Area}' AND "PERSONAL_SUBAREA"='${Personal_Subarea}'`;
			if (Pay_Grade != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "PAY_GRADE" = '${Pay_Grade}' `;
			}
			if (Division != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "DIVISION" = '${Division}' `
			}

			var Criterias_Employee =
				` INNER JOIN (SELECT DISTINCT WITHINCLUDE."USERID"
			FROM (SELECT * FROM (${Criterias_Employee_INNER}) as HRADMIN  
			LEFT JOIN "BENEFIT_INC_HRA_EMP" as INCLUDE
			ON INCLUDE."ADMIN_HR_USER" = HRADMIN."HR_USER"
			AND INCLUDE."ADMIN_SEQUENCE" = HRADMIN."SEQUENCE") as WITHINCLUDE
			LEFT OUTER JOIN "BENEFIT_EXC_HRA_EMP" as EXCLUDE
			ON EXCLUDE."ADMIN_HR_USER" = WITHINCLUDE."HR_USER"
			AND EXCLUDE."ADMIN_SEQUENCE" = WITHINCLUDE."SEQUENCE"
			AND WITHINCLUDE."USERID" = EXCLUDE."USERID") as HR_EMP
			ON LINEPAY."SCHOLAR_ID"= HR_EMP."USERID" `
		} else {
			var Criterias_Employee = ``;
		}

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
						  ON LINEPAY."SCHOLAR_ID" = coordinate.EMPLOYEEID `;
		} else {
			var CLAIMJOIN = ' ';
		}

		if (employeeId == "" && filterStartDate == "" && filterEndDate == "") {
			var sWHERE = `WHERE "CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId != "" && filterStartDate == "" && filterEndDate == "") {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE = `WHERE LINEPAY."SCHOLAR_ID" IN ${removeArray}`;
			} else {
				var sWHERE = `WHERE LINEPAY."SCHOLAR_ID" = '${employeeId}'`;
			}

			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
		} else if (employeeId == "" && filterStartDate != "" && filterEndDate != "") {
			var sWHERE = `WHERE APP."CLAIM_DATE" >= '${filterStartDate}' AND 
						  APP."CLAIM_DATE" <= '${filterEndDate}'`;

			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
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
			sWHERE = sWHERE + ` and "CLAIM_STATUS" <> 'Pending for Submission'`;
		}

		var otherFilter = [];
		if (CATEGORY_CODE != "") {
			otherFilter.push(`CATEGORY_CODE = '${CATEGORY_CODE}'`)
		}
		if (CLAIM_STATUS != "") {
			otherFilter.push(`CLAIM_STATUS = '${CLAIM_STATUS}'`)
		}
		if (CLAIM_TYPE != "") {
			otherFilter.push(`CLAIM_TYPE = '${CLAIM_TYPE}'`)
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

		var sAPPENDQUERY = payup + claim_Refernce + Criterias_Employee + CLAIMJOIN + sWHERE;
		console.log(sAPPENDQUERY);
		// var sAPPENDQUERY = CLAIMJOIN + sWHERE;
		return sAPPENDQUERY;
	};
	srv.on('exportExcelClaim', async(req, res) => {
		let tx = cds.transaction(req);
		let employeeId = req.data.USERID;
		let filterStartDate = req.data.fromDate;
		let filterEndDate = req.data.toDate;
		let claimCordin = req.data.CORDIN;
		//------Set filter for report
		var sAPPENDQUERY = _appendQueryForExcelReport(req);

		var claim_array = [{
			table: "BENEFIT_MEDICAL_CLAIM",
			label: "Medical Claim"
		}, {
			table: "BENEFIT_OVERTIME_CLAIM",
			label: "Timesheet"
		}, {
			table: "BENEFIT_PC_CLAIM",
			label: "Petty Cash"
		}, {
			table: "BENEFIT_CPR_CLAIM",
			label: "Clinical Placement Request"
		}];

		var claim_multi_claim = [{
			table: "BENEFIT_PTF_ACL_BCL_CLAIM",
			multi_items_Label: [{
				category: "PTF",
				label: "Personal Training Fund"
			}, {
				category: "CLS",
				label: "ACLS_BCLS"
			}]
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
			}]
		}];

		var claim_master_array = [{
				master: "BENEFIT_WRC_MASTER_CLAIM",
				lineItem: "BENEFIT_WRC_LINEITEM_CLAIM",
				label: "Work Related Claim"
			}, {
				master: "BENEFIT_WRC_HR_MASTER_CLAIM",
				lineItem: "BENEFIT_WRC_HR_LINEITEM_CLAIM",
				label: "Work Related Claim HR"
			}, {
				master: "BENEFIT_COV_MASTER_CLAIM",
				lineItem: "BENEFIT_COV_LINEITEM_CLAIM",
				label: "COVID-19"
			}, {
				master: "BENEFIT_SP_MASTER_CLAIM",
				lineItem: "BENEFIT_SP_LINEITEM_CLAIM",
				label: "Sponsorship Exit Exam"
			}, {
				master: "BENEFIT_SP1_MASTER_CLAIM",
				lineItem: "BENEFIT_SP1_LINEITEM_CLAIM",
				label: "Sponsorship Int Conf"
			}, {
				master: "BENEFIT_SP2_MASTER_CLAIM",
				lineItem: "BENEFIT_SP2_LINEITEM_CLAIM",
				label: "Sponsorship Reg Conf"
			}, {
				master: "BENEFIT_SP3_MASTER_CLAIM",
				lineItem: "BENEFIT_SP3_LINEITEM_CLAIM",
				label: "Sponsorship Residents"
			}, {
				master: "BENEFIT_SDFC_MASTER_CLAIM",
				lineItem: "BENEFIT_SDFC_LINEITEM_CLAIM",
				label: "SDF Claims"
			}, {
				master: "BENEFIT_SDFR_MASTER_CLAIM",
				lineItem: "BENEFIT_SDFR_LINEITEM_CLAIM",
				label: "SDF Request"
			}, {
				master: "BENEFIT_CPC_MASTER_CLAIM",
				lineItem: "BENEFIT_CPC_LINEITEM_CLAIM",
				label: "Placement Claim"
			}, {
				master: "BENEFIT_OC_MASTER_CLAIM",
				lineItem: "BENEFIT_OC_LINEITEM_CLAIM",
				label: "Other Claims"
			}, {
				master: "BENEFIT_PAY_UP_MASTER_CLAIM",
				lineItem: "BENEFIT_PAY_UP_LINEITEM_CLAIM",
				label: "Payment Upload"
			}, {
				master: "BENEFIT_TC_MASTER_CLAIM",
				lineItem: "BENEFIT_TC_LINEITEM_CLAIM",
				label: "Transport Claim"
			}]
			// Removed adding Master and LineItem in same Sheet
			// for (let claim_master_arrayI in claim_master_array){
			// 	claim_array.push({
			// 		table: claim_master_array[claim_master_arrayI].master,
			// 		label: claim_master_array[claim_master_arrayI].label
			// 	});

		// 	claim_array.push({
		// 		table: claim_master_array[claim_master_arrayI].lineItem,
		// 		label: claim_master_array[claim_master_arrayI].label+" LineItems"
		// 	})
		// }

		// claim_master_array=[];
		// Removed adding Master and LineItem in same Sheet comment the code if need the feature

		var worksheetColoumn = [],
			worksheetarray = [],
			worksheetColoumnItem = [], //new ItemWorksheet
			worksheetarrayItem = []; //new ItemWorksheet

		const workbook = new Excel.Workbook();

		//-------------- Claims without lineitems retrieval------------------------
		for (let claimIndex in claim_array) {
			worksheetColoumn = [];
			var claimList = await tx.run(`SELECT APP.*, WITHCANCEL.cancelreference FROM "${claim_array[claimIndex].table}" as APP` + sAPPENDQUERY);

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
				// worksheetarray[claimIndex].getRow(3).outlineLevel = 1;
			}
		}

		//-------------- Claims without lineitems and combined Table retrieval------------------------
		for (let claimIndexMult in claim_multi_claim) {
			worksheetColoumn = [];
			var claimListMul = await tx.run(`SELECT APP.*, WITHCANCEL.cancelreference FROM "${claim_multi_claim[claimIndexMult].table}" as APP` +
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

					worksheetarray[countClaim] = workbook.addWorksheet(claim_multi_claim[claimIndexMult].multi_items_Label[countClaim].label);
					worksheetarray[countClaim].properties.outlineProperties = {
						summaryBelow: false,
						summaryRight: false,
					};
					worksheetarray[countClaim].columns = worksheetColoumn;
					worksheetarray[countClaim].addRows(listofCategoryFiltered);
				}

				// worksheetarray[claimIndex].getRow(3).outlineLevel = 1;
			}
		}

		//--------------Master Line items Claims retrieval------------------------
		for (let claimIndexM in claim_master_array) {
			worksheetColoumn = [];
			worksheetColoumnItem = []; //new ItemWorksheet

			if (claim_master_array[claimIndexM].master == "BENEFIT_PAY_UP_MASTER_CLAIM") {
				var sAPPENDQUERYITEM = _appendQueryForExcelPAYUP(req);
			} else {
				var sAPPENDQUERYITEM = sAPPENDQUERY;
			}
			var claimListM = await tx.run(
				`SELECT DISTINCT APP.*, WITHCANCEL.cancelreference FROM "${claim_master_array[claimIndexM].master}" as APP` +
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

						// worksheetColoumn.push({   
						// 	header: key,
						// 	key: key
						// })

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
						// var newRow = worksheetarray[claimIndexM].addRow(LineItemMaster[lineItemIndex]);
						// newRow.outlineLevel = 1
						//new ItemWorksheet
						var newRow = worksheetarrayItem[claimIndexM].addRow(LineItemMaster[lineItemIndex]);
						//End new ItemWorksheet
					}
				}
			}
		}

		// titeforexcel = [{
		// 	"ID": "A-0001",
		// 	"ITEM_ID": "001"
		// }, {
		// 	"ID": "A-0002",
		// 	"ITEM_ID": "002"
		// }]
		// const workbook = new Excel.Workbook();
		// const worksheet = workbook.addWorksheet("ClaimDownload");
		// worksheet.properties.outlineProperties = {
		// 	summaryBelow: false,
		// 	summaryRight: false,
		// };
		// worksheet.columns = [{
		// 	header: "ID",
		// 	key: "ID"
		// 		// hidden: "true"
		// }, {
		// 	header: "Quotation_Item_No",
		// 	key: "ITEM_ID"
		// }];
		// var rows = [];

		// for (let i = 0; i < titeforexcel.length; i++) {
		// 	rows.push({
		// 		ID: titeforexcel[i].ID,
		// 		ITEM_ID: titeforexcel[i].ITEM_ID
		// 	})
		// }

		// worksheet.addRows(rows);
		// worksheet.getRow(3).outlineLevel = 1;
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
								result[key] = (type == "cds.Decimal" ? (isNaN(result[key]) || result[key] == '' ? 0.00 : parseFloat(result[key])) : result[
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
							} else if (result.SECOND_LEVEL_APPROVER != null && result.SECOND_LEVEL_APPROVER != '' && result.SECOND_LEVEL_APPROVER != 'N/A') {
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
				var tableDetails = tableDetails_Query(claimName);

				tableArray.push({
					"table": tableDetails[0].table,
					"name": tableDetails[0].label
				});
				for (var numw = 1; numw < numberofWroksheet; numw++) {
					var worksheet = workbook.getWorksheet(numw);
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
					
					for (var i = 0; i < rowArray.length; i++) {
						var uuid = gId();
						var result = {};
						keyHeader.forEach((key, j) => {
							var type = tableArray[numw - 1].table.elements[key].type;
							result[key] = rowArray[i][j] == undefined ? (type == "cds.Decimal" ? 0.00 : '') : rowArray[i][j];
							result[key] = (type == "cds.Decimal" ? (isNaN(result[key]) || result[key] == '' ? 0.00 : parseFloat(result[key])) : result[
								key]);
							result[key] = (type == "cds.Integer" ? (isNaN(result[key]) || result[key] == '' ? 0 : parseInt(result[key])) : result[key]);
							result[key] = (type == "cds.Date" ? (result[key].toISOString().split('T')[0]) : result[key]);
							
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
				var tx = cds.transaction(req);
				await tx.begin();
				try {
					let deletedReocrds = await tx.run(`DELETE FROM "CALCULATION_PAY_UP"`);
					console.log(deletedReocrds);
					var insert = await tx.run(INSERT.into(PAY_UP).entries(entries));
					await tx.run(INSERT.into(upload_errlog).entries({
						id: IDKey,
						error: '',
						success: 'Successfully Uploaded'
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
				if (claim == "Pay Upload Temp" && (key == "ID" || key == "SCHOLAR_UNIV" || key == "SCHOLAR_SCHEME" || key == "SCHOLAR_DISC" || key ==
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
				"BANK"."CUST_BANKACCOUNTNUMBER"
			FROM "CALCULATION_PAY_UP" AS "PAY_UP"
			LEFT JOIN "SF_SCHOLAR_SCHEME" AS "SCH"
			ON "SCH"."EXTERNALCODE" = "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "SF_INFLIGHT_SCHOLAR" AS "SCH_INFLIGHT"
			ON "SCH_INFLIGHT"."EXTERNALCODE" = "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "SF_PERPERSONAL" AS "PER_PERSON"
			ON "PER_PERSON"."PERSONIDEXTERNAL" = "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "BENEFIT_GL_MAPPING" AS "GL_MAP"
			ON "SCH"."CUST_SCHOLARSHIPSCHEME" = "GL_MAP"."SCHOLAR_SCHEME"
			LEFT JOIN "SF_BANK_ACC" AS "BANK"
			ON "BANK"."EXTERNALCODE"= "PAY_UP"."SCHOLAR_ID"
			LEFT JOIN "BENEFIT_CLAIM_CODE" AS "CLAIM_MASTER"
			ON "CLAIM_MASTER"."CLAIM_CODE"="PAY_UP"."CLAIM_CODE"
			WHERE "PAY_UP"."UPLOAD_REFERENCE_ID"='${id}'
		`
		);

		if (payUpResult.length === 0) {
			return req.reject(400, "Please provide data in the excel template.");
		}

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
						`SELECT "VENDOR_CODE" FROM "BENEFIT_VENDOR" WHERE "SCHOLAR_SCHEME"= '${payUpResult[i].CUST_SCHOLARSHIPSCHEME}' AND "VENDOR_CODE"='${payUpResult[i].VENDOR_CODE}'`
					);
					if (vendorResult.length === 0) {
						lineItemErrorMsg += `Invalid Vendor Code.`;
					}
				}
			}
			if (payUpResult[i].CURRENCY) {
				let currencyResult = await tx.run(
					`SELECT "CUST_CURRENCY" FROM "SF_BANK_ACC" WHERE "EXTERNALCODE"='${payUpResult[i].SCHOLAR_ID}' AND "CUST_CURRENCY"='${payUpResult[i].CURRENCY}'`
				);
				if (currencyResult.length === 0) {
					lineItemErrorMsg += `Invalid Currency. Currency must match scholar's primary bank currency.`;
				}
			}

			if (payUpResult[i].INVOICE_DATE && new Date(payUpResult[i].INVOICE_DATE) > new Date()) {
				lineItemErrorMsg += `Invalid Invoice Date. Invoice date should not be future date.`;
			}
			if (lineItemErrorMsg && !lineItemErrorMsg.includes(`Item ${i + 1}:`)) {
				lineItemErrorMsg = `Item ${i + 1}: ` + lineItemErrorMsg;
			}
			if (lineItemErrorMsg && !lineItemErrorMsg.includes(`\n`)) {
				lineItemErrorMsg = lineItemErrorMsg + `\n`;
			}
			errorMsg += lineItemErrorMsg;
		}
		if (errorMsg) {
			return req.reject(422, errorMsg);
		} else {
			return payUpResult;
		}
	});
}