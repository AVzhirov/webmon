<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="CashDate.aspx.cs" Inherits="WebMonitor.Pages.RK7.CashDate" EnableViewState="false"%>

<!DOCTYPE>
<html>
<head id="Head1" runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="CashDateForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Кассовая дата" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>