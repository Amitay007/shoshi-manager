import AccountsAndUsers from './pages/AccountsAndUsers';
import AddAppPage from './pages/AddAppPage';
import AddAppToDevice from './pages/AddAppToDevice';
import AddAppsFromList from './pages/AddAppsFromList';
import AddNewHeadset from './pages/AddNewHeadset';
import AppDetailsPage from './pages/AppDetailsPage';
import AppDevices from './pages/AppDevices';
import BulkDataLoader from './pages/BulkDataLoader';
import Dashboard from './pages/Dashboard';
import DataImport from './pages/DataImport';
import DataRepositories from './pages/DataRepositories';
import DataRepositoryList from './pages/DataRepositoryList';
import DataUpdater from './pages/DataUpdater';
import DeviceInfo from './pages/DeviceInfo';
import DeviceMenu from './pages/DeviceMenu';
import EditHeadset from './pages/EditHeadset';
import GeneralApps from './pages/GeneralApps';
import GeneralInfo from './pages/GeneralInfo';
import Home from './pages/Home';
import ResearchPage from './pages/ResearchPage';
import UpdateAppStatus from './pages/UpdateAppStatus';
import UpdateAppsFromPDF from './pages/UpdateAppsFromPDF';
import UploadLogo from './pages/UploadLogo';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountsAndUsers": AccountsAndUsers,
    "AddAppPage": AddAppPage,
    "AddAppToDevice": AddAppToDevice,
    "AddAppsFromList": AddAppsFromList,
    "AddNewHeadset": AddNewHeadset,
    "AppDetailsPage": AppDetailsPage,
    "AppDevices": AppDevices,
    "BulkDataLoader": BulkDataLoader,
    "Dashboard": Dashboard,
    "DataImport": DataImport,
    "DataRepositories": DataRepositories,
    "DataRepositoryList": DataRepositoryList,
    "DataUpdater": DataUpdater,
    "DeviceInfo": DeviceInfo,
    "DeviceMenu": DeviceMenu,
    "EditHeadset": EditHeadset,
    "GeneralApps": GeneralApps,
    "GeneralInfo": GeneralInfo,
    "Home": Home,
    "ResearchPage": ResearchPage,
    "UpdateAppStatus": UpdateAppStatus,
    "UpdateAppsFromPDF": UpdateAppsFromPDF,
    "UploadLogo": UploadLogo,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};