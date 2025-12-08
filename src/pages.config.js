import Home from './pages/Home';
import DeviceMenu from './pages/DeviceMenu';
import GeneralInfo from './pages/GeneralInfo';
import AppDevices from './pages/AppDevices';
import DeviceInfo from './pages/DeviceInfo';
import DataUpdater from './pages/DataUpdater';
import AddAppToDevice from './pages/AddAppToDevice';
import AddAppPage from './pages/AddAppPage';
import ResearchPage from './pages/ResearchPage';
import AppDetailsPage from './pages/AppDetailsPage';
import AccountsAndUsers from './pages/AccountsAndUsers';
import GeneralApps from './pages/GeneralApps';
import AddNewHeadset from './pages/AddNewHeadset';
import EditHeadset from './pages/EditHeadset';
import DataRepositories from './pages/DataRepositories';
import DataRepositoryList from './pages/DataRepositoryList';
import AddAppsFromList from './pages/AddAppsFromList';
import DataImport from './pages/DataImport';
import SyllabusWizard from './pages/SyllabusWizard';
import Programs from './pages/Programs';
import Schools from './pages/Schools';
import SchoolDetails from './pages/SchoolDetails';
import ProgramView from './pages/ProgramView';
import UploadLogo from './pages/UploadLogo';
import BulkDataLoader from './pages/BulkDataLoader';
import UpdateAppsFromPDF from './pages/UpdateAppsFromPDF';
import SchedulerPage from './pages/SchedulerPage';
import SyllabusValuesManager from './pages/SyllabusValuesManager';
import UpdateAppStatus from './pages/UpdateAppStatus';
import ActiveSchedulesSummary from './pages/ActiveSchedulesSummary';
import SyllabusHub from './pages/SyllabusHub';
import CRMHub from './pages/CRMHub';
import BinocularCalculator from './pages/BinocularCalculator';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "DeviceMenu": DeviceMenu,
    "GeneralInfo": GeneralInfo,
    "AppDevices": AppDevices,
    "DeviceInfo": DeviceInfo,
    "DataUpdater": DataUpdater,
    "AddAppToDevice": AddAppToDevice,
    "AddAppPage": AddAppPage,
    "ResearchPage": ResearchPage,
    "AppDetailsPage": AppDetailsPage,
    "AccountsAndUsers": AccountsAndUsers,
    "GeneralApps": GeneralApps,
    "AddNewHeadset": AddNewHeadset,
    "EditHeadset": EditHeadset,
    "DataRepositories": DataRepositories,
    "DataRepositoryList": DataRepositoryList,
    "AddAppsFromList": AddAppsFromList,
    "DataImport": DataImport,
    "SyllabusWizard": SyllabusWizard,
    "Programs": Programs,
    "Schools": Schools,
    "SchoolDetails": SchoolDetails,
    "ProgramView": ProgramView,
    "UploadLogo": UploadLogo,
    "BulkDataLoader": BulkDataLoader,
    "UpdateAppsFromPDF": UpdateAppsFromPDF,
    "SchedulerPage": SchedulerPage,
    "SyllabusValuesManager": SyllabusValuesManager,
    "UpdateAppStatus": UpdateAppStatus,
    "ActiveSchedulesSummary": ActiveSchedulesSummary,
    "SyllabusHub": SyllabusHub,
    "CRMHub": CRMHub,
    "BinocularCalculator": BinocularCalculator,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};