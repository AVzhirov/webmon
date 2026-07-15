<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="ServicePrint.aspx.cs" Inherits="WebMonitor.Pages.RK6.ServicePrint" EnableViewState="false" %>

<!DOCTYPE>

<html>
<head runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="ServicePrintForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Сервис-печать" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>
