<%@ Page Language="C#" AutoEventWireup="true" CodeBehind="WtSumTotal.aspx.cs" Inherits="WebMonitor.Pages.RK6.WtSumTotal" EnableViewState="false"%>

<!DOCTYPE>

<html>
<head id="Head1" runat="server">
    <link rel="stylesheet" type="text/css" href="../../CSS/styles.css"/>
    <title></title>
</head>
<body>
    
    <form id="WtSumForm" runat="server">
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