<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="SumWaitersTotal.aspx.cs" Inherits="WebMonitor.Pages.RK7.SumWaitersTotal" EnableViewState="false"%>

<!DOCTYPE>

<html>
<head id="Head1" runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="SumWaitersTotalForm" runat="server">
    <div align="center">
        <asp:Label ID="TitleLabel" runat="server" Text="Суммы официантов" Font-Bold="True" 
            Font-Size="Medium"></asp:Label>
    </div>
    <div>                
        <asp:PlaceHolder ID="PlaceHolder" runat="server"></asp:PlaceHolder>
    </div>
    </form>
</body>
</html>